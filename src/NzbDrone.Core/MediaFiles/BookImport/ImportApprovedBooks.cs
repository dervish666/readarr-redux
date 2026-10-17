using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NLog;
using NzbDrone.Common;
using NzbDrone.Common.Disk;
using NzbDrone.Common.Extensions;
using NzbDrone.Common.Instrumentation.Extensions;
using NzbDrone.Core.Books;
using NzbDrone.Core.Books.Calibre;
using NzbDrone.Core.Books.Commands;
using NzbDrone.Core.Books.Events;
using NzbDrone.Core.DecisionEngine;
using NzbDrone.Core.Download;
using NzbDrone.Core.Extras;
using NzbDrone.Core.History;
using NzbDrone.Core.MediaFiles.Events;
using NzbDrone.Core.Messaging.Commands;
using NzbDrone.Core.Messaging.Events;
using NzbDrone.Core.Parser;
using NzbDrone.Core.Parser.Model;
using NzbDrone.Core.Qualities;
using NzbDrone.Core.RootFolders;

namespace NzbDrone.Core.MediaFiles.BookImport
{
    public interface IImportApprovedBooks
    {
        List<ImportResult> Import(List<ImportDecision<LocalBook>> decisions, bool replaceExisting, DownloadClientItem downloadClientItem = null, ImportMode importMode = ImportMode.Auto);
        void NumberParts(List<ImportDecision<LocalBook>> decisions, Book book);
    }

    public class ImportApprovedBooks : IImportApprovedBooks
    {
        private static readonly RegexReplace PadNumbers = new RegexReplace(@"\d+", n => n.Value.PadLeft(9, '0'), RegexOptions.Compiled);
        private static readonly Regex NumberTokens = new Regex(@"\d+", RegexOptions.Compiled);

        private readonly IUpgradeMediaFiles _bookFileUpgrader;
        private readonly IMediaFileService _mediaFileService;
        private readonly IMetadataTagService _metadataTagService;
        private readonly IAuthorService _authorService;
        private readonly IAddAuthorService _addAuthorService;
        private readonly IBookService _bookService;
        private readonly IEditionService _editionService;
        private readonly IRootFolderService _rootFolderService;
        private readonly IRecycleBinProvider _recycleBinProvider;
        private readonly IExtraService _extraService;
        private readonly IDiskProvider _diskProvider;
        private readonly IHistoryService _historyService;
        private readonly IEventAggregator _eventAggregator;
        private readonly IManageCommandQueue _commandQueueManager;
        private readonly IDeleteMediaFiles _mediaFileDeletionService;
        private readonly Logger _logger;

        public ImportApprovedBooks(IUpgradeMediaFiles bookFileUpgrader,
                                   IMediaFileService mediaFileService,
                                   IMetadataTagService metadataTagService,
                                   IAuthorService authorService,
                                   IAddAuthorService addAuthorService,
                                   IBookService bookService,
                                   IEditionService editionService,
                                   IRootFolderService rootFolderService,
                                   IRecycleBinProvider recycleBinProvider,
                                   IExtraService extraService,
                                   IDiskProvider diskProvider,
                                   IHistoryService historyService,
                                   IEventAggregator eventAggregator,
                                   IManageCommandQueue commandQueueManager,
                                   IDeleteMediaFiles mediaFileDeletionService,
                                   Logger logger)
        {
            _bookFileUpgrader = bookFileUpgrader;
            _mediaFileService = mediaFileService;
            _metadataTagService = metadataTagService;
            _authorService = authorService;
            _addAuthorService = addAuthorService;
            _bookService = bookService;
            _editionService = editionService;
            _rootFolderService = rootFolderService;
            _recycleBinProvider = recycleBinProvider;
            _extraService = extraService;
            _diskProvider = diskProvider;
            _historyService = historyService;
            _eventAggregator = eventAggregator;
            _commandQueueManager = commandQueueManager;
            _mediaFileDeletionService = mediaFileDeletionService;
            _logger = logger;
        }

        public List<ImportResult> Import(List<ImportDecision<LocalBook>> decisions, bool replaceExisting, DownloadClientItem downloadClientItem = null, ImportMode importMode = ImportMode.Auto)
        {
            var importResults = new List<ImportResult>();
            var allImportedTrackFiles = new List<BookFile>();
            var allOldTrackFiles = new List<BookFile>();
            var addedAuthors = new List<Author>();
            var addedBooks = new List<Book>();

            // A rescan can list a file twice: in its own release, and again as an existing file of another release
            // matched to the edition the file belongs to. That second listing has no part number. Both reaching the
            // database fails the whole batch on BookFiles.Path, so import the file once, from its own listing (then
            // the best), and keep the other listing out of choosing editions and numbering parts.
            var listedAgain = decisions.Where(e => e.Approved && e.Item.Path != null)
                .GroupBy(e => e.Item.Path, PathEqualityComparer.Instance)
                .Where(g => g.Count() > 1)
                .SelectMany(g => g.OrderBy(e => e.Item.AdditionalFile)
                    .ThenByDescending(e => e.Item.Quality, new QualityModelComparer(g.First().Item.Author.QualityProfile))
                    .ThenByDescending(e => e.Item.Size)
                    .Skip(1))
                .ToHashSet();

            var bookDecisions = decisions.Where(e => e.Item.Book != null && e.Approved && !listedAgain.Contains(e))
                .GroupBy(e => e.Item.Book.ForeignBookId).ToList();

            var iDecision = 1;
            foreach (var bookDecision in bookDecisions)
            {
                _logger.ProgressInfo("Importing book {0}/{1} {2}", iDecision++, bookDecisions.Count, bookDecision.First().Item.Book);

                var decisionList = bookDecision.ToList();

                var author = EnsureAuthorAdded(decisionList, addedAuthors);

                if (author == null)
                {
                    // failed to add the author, carry on with next book
                    continue;
                }

                var book = EnsureBookAdded(decisionList, addedBooks);

                if (book == null)
                {
                    // failed to add the book, carry on with next one
                    continue;
                }

                var edition = EnsureEditionAdded(decisionList);

                if (edition == null)
                {
                    // failed to add the edition, carry on with next one
                    continue;
                }

                // if (replaceExisting)
                // {
                //     RemoveExistingTrackFiles(author, book);
                // }

                // Number an audiobook's parts, which also decide their filenames
                NumberParts(decisionList, book);

                // set the correct release to be monitored before importing the new files
                var newRelease = bookDecision.First().Item.Edition;
                _logger.Debug("Updating release to {0}", newRelease);
                book.Editions = _editionService.SetMonitored(newRelease);

                // Publish book edited event.
                // Deliberately don't put in the old book since we don't want to trigger an AuthorScan.
                _eventAggregator.PublishEvent(new BookEditedEvent(book, book));
            }

            var qualifiedImports = decisions.Where(c => c.Approved && !listedAgain.Contains(c))
                .GroupBy(c => c.Item.Author.Id, (i, s) => s
                         .OrderByDescending(c => c.Item.Quality, new QualityModelComparer(s.First().Item.Author.QualityProfile))
                         .ThenByDescending(c => c.Item.Size))
                .SelectMany(c => c)
                .ToList();

            _logger.ProgressInfo("Importing {0} files", qualifiedImports.Count);
            _logger.Debug("Importing {0} files. Replace existing: {1}", qualifiedImports.Count, replaceExisting);

            var filesToAdd = new List<BookFile>(qualifiedImports.Count);
            var trackImportedEvents = new List<TrackImportedEvent>(qualifiedImports.Count);
            var setAsideFiles = new Dictionary<string, List<SetAsideBookFile>>();

            // A book whose new files didn't all import is incomplete, and keeps the files they were replacing.
            // Rejected parts and second listings of a file never reach the loop below, so start from them.
            var incompleteBooks = decisions.Where(d => (!d.Approved || listedAgain.Contains(d)) && d.Item?.Book != null)
                .Select(d => d.Item.Book.ForeignBookId)
                .ToHashSet();

            // A file rejected before identification has no book, so it could be a part of any book in the batch by
            // the same author (or any book at all, if it has no author either). Treat all of those as incomplete.
            var unidentified = decisions.Where(d => !d.Approved && (d.Item?.Book == null || d.Item.Edition == null)).ToList();

            foreach (var decision in decisions.Where(d => d.Approved && d.Item.Book != null))
            {
                if (unidentified.Any(d => d.Item?.Author == null || d.Item.Author.AuthorMetadataId == decision.Item.Book.AuthorMetadataId))
                {
                    incompleteBooks.Add(decision.Item.Book.ForeignBookId);
                }
            }

            // A gap in a book's part numbers means a part never arrived
            foreach (var book in decisions.Where(d => d.Item?.Book != null).GroupBy(d => d.Item.Book.ForeignBookId))
            {
                var parts = book.Select(d => d.Item.Part).Where(p => p > 0).Distinct().ToList();

                if (parts.Any() && parts.Max() > parts.Count)
                {
                    incompleteBooks.Add(book.Key);
                }
            }

            var importedPaths = new HashSet<string>(PathEqualityComparer.Instance);
            var downloadedFiles = new List<(LocalBook Track, BookFile File)>();

            foreach (var importDecision in qualifiedImports)
            {
                var localTrack = importDecision.Item;
                var oldFiles = new List<BookFile>();
                var imported = false;

                try
                {
                    //check if already imported
                    var samePart = importResults.FirstOrDefault(r => r.ImportDecision.Item.Book.Id == localTrack.Book.Id && r.ImportDecision.Item.Part == localTrack.Part);

                    if (samePart != null)
                    {
                        // A second file claiming the part stays in the download folder, so say which one
                        _logger.Warn("Skipped {0}: {1} came first for part {2} of {3}",
                            localTrack.Path,
                            Path.GetFileName(samePart.ImportDecision.Item.Path),
                            localTrack.Part,
                            localTrack.Book);

                        importResults.Add(new ImportResult(importDecision, "Book has already been imported"));
                        incompleteBooks.Add(localTrack.Book.ForeignBookId);
                        continue;
                    }

                    localTrack.Book.Author = localTrack.Author;

                    var bookFile = new BookFile
                    {
                        Path = localTrack.Path.CleanFilePath(),
                        CalibreId = localTrack.CalibreId,
                        Part = localTrack.Part,
                        PartCount = localTrack.PartCount,
                        Size = localTrack.Size,
                        Modified = localTrack.Modified,
                        DateAdded = DateTime.UtcNow,
                        ReleaseGroup = localTrack.ReleaseGroup,
                        Quality = localTrack.Quality,
                        MediaInfo = localTrack.FileTrackInfo.MediaInfo,
                        EditionId = localTrack.Edition.Id,
                        Author = localTrack.Author,
                        Edition = localTrack.Edition
                    };

                    if (downloadClientItem?.DownloadId.IsNotNullOrWhiteSpace() == true)
                    {
                        var grabHistory = _historyService.FindByDownloadId(downloadClientItem.DownloadId)
                            .OrderByDescending(h => h.Date)
                            .FirstOrDefault(h => h.EventType == EntityHistoryEventType.Grabbed);

                        if (Enum.TryParse(grabHistory?.Data.GetValueOrDefault("indexerFlags"), true, out IndexerFlags flags))
                        {
                            bookFile.IndexerFlags = flags;
                        }
                    }
                    else
                    {
                        bookFile.IndexerFlags = localTrack.IndexerFlags;
                    }

                    bool copyOnly;
                    switch (importMode)
                    {
                        default:
                        case ImportMode.Auto:
                            copyOnly = downloadClientItem != null && !downloadClientItem.CanMoveFiles;
                            break;
                        case ImportMode.Move:
                            copyOnly = false;
                            break;
                        case ImportMode.Copy:
                            copyOnly = true;
                            break;
                    }

                    if (!localTrack.ExistingFile)
                    {
                        bookFile.SceneName = GetSceneReleaseName(downloadClientItem);

                        var moveResult = _bookFileUpgrader.UpgradeBookFile(bookFile, localTrack, copyOnly, importedPaths);
                        oldFiles = moveResult.OldFiles;

                        if (moveResult.SetAsideFiles.Any())
                        {
                            if (!setAsideFiles.TryGetValue(localTrack.Book.ForeignBookId, out var bookSetAsideFiles))
                            {
                                bookSetAsideFiles = new List<SetAsideBookFile>();
                                setAsideFiles[localTrack.Book.ForeignBookId] = bookSetAsideFiles;
                            }

                            bookSetAsideFiles.AddRange(moveResult.SetAsideFiles);
                        }
                    }
                    else
                    {
                        // Delete existing files from the DB mapped to this path
                        var previousFile = _mediaFileService.GetFileWithPath(bookFile.Path);

                        if (previousFile != null)
                        {
                            _mediaFileService.Delete(previousFile, DeleteMediaFileReason.ManualOverride);

                            if (bookFile.CalibreId == 0 && previousFile.CalibreId != 0)
                            {
                                bookFile.CalibreId = previousFile.CalibreId;
                            }
                        }

                        try
                        {
                            _metadataTagService.WriteTags(bookFile, false);
                        }
                        catch (Exception e)
                        {
                            // The old row for this path is already gone, so a failed retag must not stop the file being added back
                            _logger.Warn(e, "Couldn't write tags to {0}, keeping its existing tags", bookFile.Path);
                        }

                        KeepSizeAndModified(bookFile, localTrack);
                    }

                    filesToAdd.Add(bookFile);
                    importResults.Add(new ImportResult(importDecision) { SourceMoved = !copyOnly && !localTrack.ExistingFile });

                    if (!localTrack.ExistingFile)
                    {
                        _extraService.ImportTrack(localTrack, bookFile, copyOnly);
                    }

                    allImportedTrackFiles.Add(bookFile);
                    allOldTrackFiles.AddRange(oldFiles);

                    if (!localTrack.ExistingFile)
                    {
                        downloadedFiles.Add((localTrack, bookFile));
                    }

                    // create all the import events here, but we can't publish until the trackfiles have been
                    // inserted and ids created
                    trackImportedEvents.Add(new TrackImportedEvent(localTrack, bookFile, oldFiles, !localTrack.ExistingFile, downloadClientItem));
                    imported = true;
                }
                catch (RootFolderNotFoundException e)
                {
                    _logger.Warn(e, "Couldn't import book " + localTrack);
                    _eventAggregator.PublishEvent(new TrackImportFailedEvent(e, localTrack, !localTrack.ExistingFile, downloadClientItem));

                    importResults.Add(new ImportResult(importDecision, "Failed to import book, root folder missing."));
                }
                catch (DestinationAlreadyExistsException e)
                {
                    _logger.Warn(e, "Couldn't import book " + localTrack);
                    importResults.Add(new ImportResult(importDecision, "Failed to import book, destination already exists."));
                }
                catch (UnauthorizedAccessException e)
                {
                    _logger.Warn(e, "Couldn't import book " + localTrack);
                    _eventAggregator.PublishEvent(new TrackImportFailedEvent(e, localTrack, !localTrack.ExistingFile, downloadClientItem));

                    importResults.Add(new ImportResult(importDecision, "Failed to import book, permissions error"));
                }
                catch (RecycleBinException e)
                {
                    _logger.Warn(e, "Couldn't import book " + localTrack);
                    _eventAggregator.PublishEvent(new TrackImportFailedEvent(e, localTrack, !localTrack.ExistingFile, downloadClientItem));

                    importResults.Add(new ImportResult(importDecision, "Failed to import book, unable to move existing file to the Recycle Bin."));
                }
                catch (CalibreException e)
                {
                    _logger.Warn(e, "Couldn't import book " + localTrack);

                    importResults.Add(new ImportResult(importDecision, "Failed to import book, error communicating with Calibre.  Check log for details."));
                }
                catch (Exception e)
                {
                    _logger.Warn(e, "Couldn't import book " + localTrack);
                    importResults.Add(new ImportResult(importDecision, "Failed to import book."));
                }

                if (!imported)
                {
                    incompleteBooks.Add(localTrack.Book.ForeignBookId);
                }
            }

            var watch = new System.Diagnostics.Stopwatch();
            watch.Start();

            try
            {
                _mediaFileService.AddMany(filesToAdd);
            }
            catch
            {
                // Without the new rows the import didn't take, so nothing it replaced may be recycled
                foreach (var bookSetAsideFiles in setAsideFiles.Values)
                {
                    var kept = _bookFileUpgrader.RestoreSetAsideFiles(bookSetAsideFiles);

                    if (kept.Any())
                    {
                        _logger.Error("Couldn't save the imported book files, so the {0} files they replaced were kept in {1}",
                            kept.Count,
                            kept.Select(x => Path.GetDirectoryName(x.Path)).Distinct().ConcatToString(", "));
                    }
                }

                throw;
            }

            _logger.Debug("Inserted new trackfiles in {0}ms", watch.ElapsedMilliseconds);

            // Only drop the files an upgrade replaced once every part of the new release is in place
            foreach (var bookSetAsideFiles in setAsideFiles)
            {
                if (incompleteBooks.Contains(bookSetAsideFiles.Key))
                {
                    // Put back what fits; a new part sitting on an old path keeps that old file set aside
                    var kept = _bookFileUpgrader.RestoreSetAsideFiles(bookSetAsideFiles.Value);

                    _logger.Warn("Not every file for {0} imported, so the {1} files it was replacing were kept: {2} put back, {3} left in {4}",
                        qualifiedImports.First(x => x.Item.Book.ForeignBookId == bookSetAsideFiles.Key).Item.Book,
                        bookSetAsideFiles.Value.Count,
                        bookSetAsideFiles.Value.Count - kept.Count,
                        kept.Count,
                        kept.Select(x => Path.GetDirectoryName(x.Path)).Distinct().ConcatToString(", "));
                    continue;
                }

                _bookFileUpgrader.RemoveSetAsideFiles(bookSetAsideFiles.Value);
            }

            RemoveEarlierCopies(downloadedFiles, downloadClientItem);

            // now that trackfiles have been inserted and ids generated, publish the import events
            foreach (var trackImportedEvent in trackImportedEvents)
            {
                _eventAggregator.PublishEvent(trackImportedEvent);
            }

            var bookImports = importResults.Where(e => e.ImportDecision.Item.Book != null)
                .GroupBy(e => e.ImportDecision.Item.Book.Id).ToList();

            foreach (var bookImport in bookImports)
            {
                var book = bookImport.First().ImportDecision.Item.Book;
                var edition = book.Editions.Value.Single(x => x.Monitored);
                var author = bookImport.First().ImportDecision.Item.Author;

                if (bookImport.Where(e => e.Errors.Count == 0).ToList().Count > 0 && author != null && book != null)
                {
                    _eventAggregator.PublishEvent(new BookImportedEvent(
                        author,
                        book,
                        allImportedTrackFiles.Where(s => s.EditionId == edition.Id).ToList(),
                        allOldTrackFiles.Where(s => s.EditionId == edition.Id).ToList(),
                        replaceExisting,
                        downloadClientItem));
                }
            }

            // Added only now, so a second listing never counts as the file that came first for a part
            foreach (var decision in listedAgain)
            {
                _logger.Debug("Skipped {0}, it is listed twice", decision.Item.Path);
                importResults.Add(new ImportResult(decision, "Book has already been imported"));
            }

            //Adding all the rejected decisions
            importResults.AddRange(decisions.Where(c => !c.Approved)
                                            .Select(d => new ImportResult(d, d.Rejections.Select(r => r.Reason).ToArray())));

            // Refresh any authors we added
            if (addedAuthors.Any())
            {
                _commandQueueManager.Push(new BulkRefreshAuthorCommand(addedAuthors.Select(x => x.Id).ToList(), true));
            }

            var addedAuthorMetadataIds = addedAuthors.Select(x => x.AuthorMetadataId).ToHashSet();
            var booksToRefresh = addedBooks.Where(x => !addedAuthorMetadataIds.Contains(x.AuthorMetadataId)).ToList();

            if (booksToRefresh.Any())
            {
                _logger.Debug("Refreshing info for {0} new books", booksToRefresh.Count);
                _commandQueueManager.Push(new BulkRefreshBookCommand(booksToRefresh.Select(x => x.Id).ToList()));
            }

            return importResults;
        }

        // A download imported for the wrong book and then again for the right one leaves the same file on both books, at
        // two paths: Everville's on Hellraiser #5, Heart of the Comet's on Contacting Aliens. An import only replaces
        // its own book's files, so take the earlier copy off the other book now, if it is provably still that file.
        private void RemoveEarlierCopies(List<(LocalBook Track, BookFile File)> downloadedFiles, DownloadClientItem downloadClientItem)
        {
            if (!downloadedFiles.Any() || downloadClientItem == null || downloadClientItem.DownloadId.IsNullOrWhiteSpace() || downloadClientItem.OutputPath.IsEmpty)
            {
                return;
            }

            try
            {
                var earlierImports = _historyService.FindByDownloadId(downloadClientItem.DownloadId)
                    .Where(h => h.EventType == EntityHistoryEventType.BookFileImported)
                    .ToList();

                if (!earlierImports.Any())
                {
                    return;
                }

                foreach (var (track, file) in downloadedFiles)
                {
                    RemoveEarlierCopies(track, file, PathInDownload(downloadClientItem.OutputPath.FullPath, track.Path), earlierImports);
                }
            }
            catch (Exception e)
            {
                // The new files are in, so this only leaves a stray copy behind
                _logger.Warn(e, "Couldn't look for earlier imports of {0} for other books", downloadClientItem.Title);
            }
        }

        private void RemoveEarlierCopies(LocalBook track, BookFile file, List<string> pathInDownload, List<EntityHistory> earlierImports)
        {
            if (pathInDownload == null)
            {
                return;
            }

            // The same file of the download, with the size it had then. The path to the download can change between
            // imports (another client, another mount), its path within the download can't.
            var copyIds = earlierImports
                .Where(h => h.BookId != track.Book.Id &&
                            EndsWith(Segments(h.Data.GetValueOrDefault("droppedPath")), pathInDownload) &&
                            h.Data.GetValueOrDefault("size") == track.Size.ToString())
                .Select(h => int.TryParse(h.Data.GetValueOrDefault("fileId"), out var id) ? id : 0)
                .Where(id => id > 0 && id != file.Id)
                .Distinct()
                .ToList();

            if (!copyIds.Any())
            {
                return;
            }

            foreach (var copy in _mediaFileService.Get(copyIds))
            {
                // Put right by hand since, or gone from disk, which a rescan deals with. A rescan also rewrites the row
                // of a file that changed, so only the download's own size, recorded when it was imported, shows the
                // copy is still that file: one replaced since, or retagged to another size, stays. Calibre can only
                // delete a whole book, which may hold other formats.
                if (copy.Edition?.Value?.BookId == track.Book.Id ||
                    copy.Path.PathEquals(file.Path) ||
                    copy.CalibreId != 0 ||
                    !_diskProvider.FileExists(copy.Path) ||
                    _diskProvider.GetFileSize(copy.Path) != track.Size ||
                    copy.Size != track.Size ||
                    Math.Abs((_diskProvider.FileGetLastWrite(copy.Path) - copy.Modified.ToUniversalTime()).TotalSeconds) > 1)
                {
                    _logger.Debug("Keeping {0}, an earlier import of {1}: it can't be shown to be the same file on another book", copy.Path, track.Path);
                    continue;
                }

                _logger.Warn("{0} was imported from the same download for another book, removing it now that {1} has the file", copy.Path, track.Book);

                var author = copy.Author?.Value;

                if (author != null)
                {
                    _mediaFileDeletionService.DeleteTrackFile(author, copy);
                }
                else
                {
                    _mediaFileDeletionService.DeleteTrackFile(copy);
                }
            }
        }

        // The file's path from the download's own folder down, or null when it isn't in the download
        private static List<string> PathInDownload(string outputPath, string path)
        {
            if (path.PathEquals(outputPath))
            {
                return new List<string> { Path.GetFileName(path) };
            }

            if (!outputPath.IsParentPath(path))
            {
                return null;
            }

            return Segments(outputPath).TakeLast(1).Concat(Segments(outputPath.GetRelativePath(path))).ToList();
        }

        private static List<string> Segments(string path)
        {
            return (path ?? string.Empty).Split(new[] { '/', '\\' }, StringSplitOptions.RemoveEmptyEntries).ToList();
        }

        private static bool EndsWith(List<string> path, List<string> end)
        {
            return path.Count >= end.Count && path.Skip(path.Count - end.Count).SequenceEqual(end);
        }

        // Writing tags changes a file after the rescan read it, and the rescan stores what it read over the new row. With
        // the size and time from before the retag the next scan sees the file as changed, and imports and retags it
        // again: the same books went round on every scan. Both get the file as it is now.
        private void KeepSizeAndModified(BookFile bookFile, LocalBook localTrack)
        {
            try
            {
                if (!_diskProvider.FileExists(bookFile.Path))
                {
                    return;
                }

                bookFile.Size = localTrack.Size = _diskProvider.GetFileSize(bookFile.Path);
                bookFile.Modified = localTrack.Modified = _diskProvider.FileGetLastWrite(bookFile.Path);
            }
            catch (Exception e)
            {
                _logger.Warn(e, "Couldn't read {0} after writing its tags, the next scan may import it again", bookFile.Path);
            }
        }

        // The part numbers one book's files will import with, which also decide their filenames
        public void NumberParts(List<ImportDecision<LocalBook>> decisions, Book book)
        {
            // Make sure part numbers are populated for audiobooks
            // If all audio files and all part numbers are zero, set them by filename order
            if (decisions.All(b => MediaFileExtensions.AudioExtensions.Contains(Path.GetExtension(b.Item.Path)) && b.Item.Part == 0))
            {
                var part = 1;
                foreach (var d in decisions.OrderBy(x => PadNumbers.Replace(x.Item.Path)))
                {
                    d.Item.Part = part++;
                }
            }

            NumberClashingPartsFromFilenames(decisions, book);
        }

        // An audiobook's part numbers come from its files' track tags, and only one file per part number imports.
        // When two files claim the same part, number them from their filenames where that is provably right.
        // Otherwise the tags stand and the import skips the later files for a part, with a warning for each.
        private void NumberClashingPartsFromFilenames(List<ImportDecision<LocalBook>> decisions, Book book)
        {
            // Rejected files (a preview, a file that isn't an upgrade) don't take part, and a file listed twice is
            // still one file
            var files = decisions.Where(d => d.Approved && d.Item.Path != null)
                .GroupBy(d => d.Item.Path, PathEqualityComparer.Instance)
                .ToList();

            // The formats of an ebook all claim part 1 and the best one imports, so only audiobooks are numbered
            if (files.Count < 2 || !files.All(f => MediaFileExtensions.AudioExtensions.Contains(Path.GetExtension(f.Key))))
            {
                return;
            }

            var clashes = files.GroupBy(f => f.First().Item.Part).Count(g => g.Count() > 1);

            if (clashes == 0)
            {
                return;
            }

            var numbers = PartsFromFilenames(files);

            if (numbers == null)
            {
                _logger.Debug("Track tags of {0} give files the same part and their filenames don't number them", book);
                return;
            }

            _logger.Info("Track tags of {0} give files the same part, numbering its {1} files from their filenames", book, files.Count);

            foreach (var file in files)
            {
                foreach (var decision in file)
                {
                    decision.Item.Part = numbers[file.Key];
                    decision.Item.PartCount = files.Count;
                }
            }
        }

        // The part number each file's name gives it, or null unless all of these hold: the files are one edition in
        // one folder (two editions, or discs in their own folders, each count from 1), no tag claims a part beyond
        // the file count (that means parts are missing, which renumbering would hide), no number in the names is
        // past the file count either, and the numbers in the names that run 1 to N across the N files all put the
        // files in the same order.
        private static Dictionary<string, int> PartsFromFilenames(List<IGrouping<string, ImportDecision<LocalBook>>> files)
        {
            var items = files.Select(f => f.First().Item).ToList();

            if (items.Select(x => x.Edition?.ForeignEditionId).Distinct().Count() != 1 ||
                items.Select(x => Path.GetDirectoryName(x.Path)).Distinct(PathEqualityComparer.Instance).Count() != 1 ||
                items.Max(x => x.Part) > files.Count)
            {
                return null;
            }

            var tokens = files.Select(f => NumberTokens.Matches(Path.GetFileNameWithoutExtension(f.Key))
                    .Select(m => int.TryParse(m.Value, out var n) ? n : -1)
                    .ToList())
                .ToList();

            var tokenCount = tokens[0].Count;

            // A number past the file count ("01 of 04" with 3 files, "Chapter 10", a year, "64 Kbps") says the
            // names count something other than these files, or that parts are missing
            if (tokens.Any(t => t.Count != tokenCount) || tokens.SelectMany(t => t).Any(n => n < 0 || n > files.Count))
            {
                return null;
            }

            var expected = Enumerable.Range(1, files.Count);
            var sequences = Enumerable.Range(0, tokenCount)
                .Select(i => tokens.Select(t => t[i]).ToList())
                .Where(values => values.OrderBy(v => v).SequenceEqual(expected))
                .ToList();

            // "01 Chapter 03", "02 Chapter 02", "03 Chapter 01" gives two orders and nothing says which is right
            if (!sequences.Any() || sequences.Skip(1).Any(values => !values.SequenceEqual(sequences[0])))
            {
                return null;
            }

            return files.Select((f, n) => new { f.Key, Part = sequences[0][n] })
                .ToDictionary(x => x.Key, x => x.Part, PathEqualityComparer.Instance);
        }

        private Author EnsureAuthorAdded(List<ImportDecision<LocalBook>> decisions, List<Author> addedAuthors)
        {
            var author = decisions.First().Item.Author;

            if (author.Id == 0)
            {
                var dbAuthor = _authorService.FindById(author.ForeignAuthorId);

                if (dbAuthor == null)
                {
                    _logger.Debug("Adding remote author {0}", author);

                    var path = decisions.First().Item.Path;
                    var rootFolder = _rootFolderService.GetBestRootFolder(path);

                    author.RootFolderPath = rootFolder.Path;
                    author.MetadataProfileId = rootFolder.DefaultMetadataProfileId;
                    author.QualityProfileId = rootFolder.DefaultQualityProfileId;
                    author.Monitored = rootFolder.DefaultMonitorOption != MonitorTypes.None;
                    author.MonitorNewItems = rootFolder.DefaultNewItemMonitorOption;
                    author.Tags = rootFolder.DefaultTags;
                    author.AddOptions = new AddAuthorOptions
                    {
                        SearchForMissingBooks = false,
                        Monitored = author.Monitored,
                        Monitor = rootFolder.DefaultMonitorOption
                    };

                    if (rootFolder.IsCalibreLibrary)
                    {
                        // calibre has author / book / files
                        author.Path = path.GetParentPath().GetParentPath();
                    }

                    try
                    {
                        dbAuthor = _addAuthorService.AddAuthor(author, false);

                        // this looks redundant but is necessary to get the LazyLoads populated
                        dbAuthor = _authorService.GetAuthor(dbAuthor.Id);
                        addedAuthors.Add(dbAuthor);
                    }
                    catch (Exception e)
                    {
                        _logger.Error(e, "Failed to add author {0}", author);
                        foreach (var decision in decisions)
                        {
                            decision.Reject(new Rejection("Failed to add missing author", RejectionType.Temporary));
                        }

                        return null;
                    }
                }

                // Put in the newly loaded author
                foreach (var decision in decisions)
                {
                    decision.Item.Author = dbAuthor;
                    decision.Item.Book.Author = dbAuthor;
                    decision.Item.Book.AuthorMetadataId = dbAuthor.AuthorMetadataId;
                }

                author = dbAuthor;
            }

            return author;
        }

        private Book EnsureBookAdded(List<ImportDecision<LocalBook>> decisions, List<Book> addedBooks)
        {
            var book = decisions.First().Item.Book;

            if (book.Id == 0)
            {
                var dbBook = _bookService.FindById(book.ForeignBookId);

                if (dbBook == null)
                {
                    _logger.Debug("Adding remote book {0}", book);

                    if (book.AuthorMetadataId == 0)
                    {
                        throw new InvalidOperationException("Cannot insert book with AuthorMetadataId = 0");
                    }

                    try
                    {
                        book.Monitored = book.Author.Value.Monitored;
                        book.Added = DateTime.UtcNow;
                        _bookService.InsertMany(new List<Book> { book });
                        addedBooks.Add(book);

                        book.Editions.Value.ForEach(x => x.BookId = book.Id);
                        _editionService.InsertMany(book.Editions.Value);

                        dbBook = _bookService.FindById(book.ForeignBookId);
                    }
                    catch (Exception e)
                    {
                        _logger.Error(e, "Failed to add book {0}", book);
                        RejectBook(decisions);

                        return null;
                    }
                }

                var edition = dbBook.Editions.Value.ExclusiveOrDefault(x => x.ForeignEditionId == decisions.First().Item.Edition.ForeignEditionId);
                if (edition == null)
                {
                    RejectBook(decisions);
                    return null;
                }

                // Populate the new DB book
                foreach (var decision in decisions)
                {
                    decision.Item.Book = dbBook;
                    decision.Item.Edition = edition;
                }

                book = dbBook;
            }

            return book;
        }

        private Edition EnsureEditionAdded(List<ImportDecision<LocalBook>> decisions)
        {
            var book = decisions.First().Item.Book;
            var edition = decisions.First().Item.Edition;

            if (edition.Id == 0)
            {
                var dbEdition = _editionService.GetEditionByForeignEditionId(edition.ForeignEditionId);

                if (dbEdition == null)
                {
                    _logger.Debug("Adding remote edition {0}", edition);

                    try
                    {
                        edition.BookId = book.Id;
                        edition.Monitored = false;

                        // A refresh puts the user's title, overview and page count on every edition, so one added
                        // here has to get them too, or the book shows the source's values until the next refresh
                        book.MetadataOverrides?.ApplyTo(edition);

                        _editionService.InsertMany(new List<Edition> { edition });

                        dbEdition = _editionService.GetEditionByForeignEditionId(edition.ForeignEditionId);
                    }
                    catch (Exception e)
                    {
                        _logger.Error(e, "Failed to add edition {0}", edition);
                        RejectBook(decisions);

                        return null;
                    }

                    // Populate the new DB book
                    foreach (var decision in decisions)
                    {
                        decision.Item.Edition = dbEdition;
                    }

                    edition = dbEdition;
                }
            }

            return edition;
        }

        private void RejectBook(List<ImportDecision<LocalBook>> decisions)
        {
            foreach (var decision in decisions)
            {
                decision.Reject(new Rejection("Failed to add missing book", RejectionType.Temporary));
            }
        }

        private void RemoveExistingTrackFiles(Author author, Book book)
        {
            var rootFolder = _diskProvider.GetParentFolder(author.Path);
            var previousFiles = _mediaFileService.GetFilesByBook(book.Id);

            _logger.Debug("Deleting {0} existing files for {1}", previousFiles.Count, book);

            foreach (var previousFile in previousFiles)
            {
                var subfolder = rootFolder.GetRelativePath(_diskProvider.GetParentFolder(previousFile.Path));
                if (_diskProvider.FileExists(previousFile.Path))
                {
                    _logger.Debug("Removing existing book file: {0}", previousFile);
                    _recycleBinProvider.DeleteFile(previousFile.Path, subfolder);
                }

                _mediaFileService.Delete(previousFile, DeleteMediaFileReason.Upgrade);
            }
        }

        private string GetSceneReleaseName(DownloadClientItem downloadClientItem)
        {
            if (downloadClientItem != null)
            {
                var title = Parser.Parser.RemoveFileExtension(downloadClientItem.Title);

                var parsedTitle = Parser.Parser.ParseBookTitle(title);

                if (parsedTitle != null)
                {
                    return title;
                }
            }

            return null;
        }
    }
}
