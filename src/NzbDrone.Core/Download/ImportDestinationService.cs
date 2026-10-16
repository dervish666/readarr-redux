using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Abstractions;
using System.Linq;
using NLog;
using NzbDrone.Common.Disk;
using NzbDrone.Common.Extensions;
using NzbDrone.Core.Books;
using NzbDrone.Core.Datastore;
using NzbDrone.Core.Download.TrackedDownloads;
using NzbDrone.Core.MediaFiles;
using NzbDrone.Core.MediaFiles.BookImport;
using NzbDrone.Core.Parser.Model;
using NzbDrone.Core.Qualities;

namespace NzbDrone.Core.Download
{
    public interface IImportDestinationService
    {
        List<ImportDestination> GetDestinations(TrackedDownload trackedDownload);
    }

    // A file in a completed download, where importing it would put it, and what is already there
    public class ImportDestination
    {
        public string SourcePath { get; set; }
        public long SourceSize { get; set; }
        public DateTime SourceModified { get; set; }
        public QualityModel SourceQuality { get; set; }
        public ParsedTrackInfo SourceTags { get; set; }
        public string AuthorName { get; set; }
        public string BookTitle { get; set; }
        public List<string> Rejections { get; set; }

        public string DestinationPath { get; set; }
        public bool DestinationExists { get; set; }
        public long DestinationSize { get; set; }
        public DateTime? DestinationModified { get; set; }
        public ParsedTrackInfo DestinationTags { get; set; }

        // The library's record of the file already at the destination, if it has one
        public int? DestinationBookFileId { get; set; }
        public QualityModel DestinationQuality { get; set; }
        public string DestinationAuthorName { get; set; }
        public string DestinationBookTitle { get; set; }
    }

    public class ImportDestinationService : IImportDestinationService
    {
        private readonly IDiskProvider _diskProvider;
        private readonly IDiskScanService _diskScanService;
        private readonly IMakeImportDecision _importDecisionMaker;
        private readonly IImportApprovedBooks _importApprovedBooks;
        private readonly IMoveBookFiles _bookFileMover;
        private readonly IMediaFileService _mediaFileService;
        private readonly IMetadataTagService _metadataTagService;
        private readonly IEditionService _editionService;
        private readonly IBookService _bookService;
        private readonly IAuthorService _authorService;
        private readonly ICompletedDownloadService _completedDownloadService;
        private readonly IProvideImportItemService _provideImportItemService;
        private readonly Logger _logger;

        public ImportDestinationService(IDiskProvider diskProvider,
                                        IDiskScanService diskScanService,
                                        IMakeImportDecision importDecisionMaker,
                                        IImportApprovedBooks importApprovedBooks,
                                        IMoveBookFiles bookFileMover,
                                        IMediaFileService mediaFileService,
                                        IMetadataTagService metadataTagService,
                                        IEditionService editionService,
                                        IBookService bookService,
                                        IAuthorService authorService,
                                        ICompletedDownloadService completedDownloadService,
                                        IProvideImportItemService provideImportItemService,
                                        Logger logger)
        {
            _diskProvider = diskProvider;
            _diskScanService = diskScanService;
            _importDecisionMaker = importDecisionMaker;
            _importApprovedBooks = importApprovedBooks;
            _bookFileMover = bookFileMover;
            _mediaFileService = mediaFileService;
            _metadataTagService = metadataTagService;
            _editionService = editionService;
            _bookService = bookService;
            _authorService = authorService;
            _completedDownloadService = completedDownloadService;
            _provideImportItemService = provideImportItemService;
            _logger = logger;
        }

        public List<ImportDestination> GetDestinations(TrackedDownload trackedDownload)
        {
            trackedDownload.ImportItem ??= _provideImportItemService.ProvideImportItem(trackedDownload.DownloadItem, null);

            var outputPath = trackedDownload.ImportItem?.OutputPath.FullPath;
            List<IFileInfo> files;
            ParsedBookInfo folderInfo = null;

            if (outputPath.IsNullOrWhiteSpace())
            {
                return new List<ImportDestination>();
            }

            if (_diskProvider.FolderExists(outputPath))
            {
                files = _diskScanService.FilterFiles(outputPath, _diskScanService.GetBookFiles(outputPath));
                folderInfo = Parser.Parser.ParseBookTitle(Path.GetFileName(outputPath));
            }
            else if (_diskProvider.FileExists(outputPath))
            {
                files = new List<IFileInfo> { _diskProvider.GetFileInfo(outputPath) };
            }
            else
            {
                return new List<ImportDestination>();
            }

            Book grabbedBook = null;

            try
            {
                grabbedBook = _completedDownloadService.GetGrabbedBook(trackedDownload);
            }
            catch (GrabbedBookNotFoundException e)
            {
                _logger.Debug(e, "Previewing {0} without the book it was grabbed for", trackedDownload.DownloadItem.Title);
            }

            // Identified the way the import identifies them, but ignoring the match threshold so a file that isn't a
            // close enough match still shows where it would go
            var decisions = _importDecisionMaker.GetImportDecisions(files,
                new IdentificationOverrides
                {
                    Author = trackedDownload.RemoteBook?.Author,
                    GrabbedBook = grabbedBook
                },
                new ImportDecisionMakerInfo
                {
                    DownloadClientItem = trackedDownload.DownloadItem,
                    ParsedBookInfo = folderInfo
                },
                new ImportDecisionMakerConfig
                {
                    Filter = FilterFilesType.None,
                    NewDownload = true,
                    SingleRelease = false,
                    IncludeExisting = false,
                    AddNewAuthors = false,
                    IgnoreMatchThreshold = true
                });

            var identified = decisions.Where(d => d.Item?.Author != null && d.Item.Book != null && d.Item.Edition != null && !d.Item.AdditionalFile).ToList();

            foreach (var book in identified.Where(d => d.Approved).GroupBy(d => d.Item.Book.ForeignBookId))
            {
                _importApprovedBooks.NumberParts(book.ToList(), book.First().Item.Book);
            }

            return identified.Select(GetDestination)
                .Concat(decisions.Except(identified).Where(d => d.Item?.Path != null && !d.Item.AdditionalFile).Select(Unidentified))
                .ToList();
        }

        private ImportDestination GetDestination(ImportDecision<LocalBook> decision)
        {
            var localBook = decision.Item;
            var bookFile = new BookFile
            {
                Path = localBook.Path,
                Part = localBook.Part,
                PartCount = localBook.PartCount,
                Size = localBook.Size,
                Modified = localBook.Modified,
                ReleaseGroup = localBook.ReleaseGroup,
                Quality = localBook.Quality,
                MediaInfo = localBook.FileTrackInfo?.MediaInfo,
                EditionId = localBook.Edition.Id,
                Author = localBook.Author,
                Edition = localBook.Edition
            };

            var destination = Unidentified(decision);
            destination.AuthorName = localBook.Author.Name;
            destination.BookTitle = localBook.Book.Title;
            destination.DestinationPath = _bookFileMover.GetBookFilePath(bookFile, localBook);

            if (destination.DestinationPath.IsNullOrWhiteSpace() || !_diskProvider.FileExists(destination.DestinationPath))
            {
                return destination;
            }

            var existing = _diskProvider.GetFileInfo(destination.DestinationPath);
            destination.DestinationExists = true;
            destination.DestinationSize = existing.Length;
            destination.DestinationModified = existing.LastWriteTimeUtc;

            try
            {
                destination.DestinationTags = _metadataTagService.ReadTags(existing);
            }
            catch (Exception e)
            {
                _logger.Debug(e, "Couldn't read the tags of {0}", destination.DestinationPath);
            }

            var occupant = _mediaFileService.GetFileWithPath(destination.DestinationPath);

            if (occupant != null)
            {
                destination.DestinationBookFileId = occupant.Id;
                destination.DestinationQuality = occupant.Quality;

                if (occupant.EditionId > 0)
                {
                    try
                    {
                        var edition = _editionService.GetEdition(occupant.EditionId);
                        var book = _bookService.GetBook(edition.BookId);

                        destination.DestinationBookTitle = book.Title;
                        destination.DestinationAuthorName = _authorService.GetAuthorByMetadataId(book.AuthorMetadataId)?.Name;
                    }
                    catch (ModelNotFoundException)
                    {
                        // A row left behind by a deleted book, the file isn't any book's
                    }
                }
            }

            return destination;
        }

        private static ImportDestination Unidentified(ImportDecision<LocalBook> decision)
        {
            return new ImportDestination
            {
                SourcePath = decision.Item.Path,
                SourceSize = decision.Item.Size,
                SourceModified = decision.Item.Modified,
                SourceQuality = decision.Item.Quality,
                SourceTags = decision.Item.FileTrackInfo,
                Rejections = decision.Rejections.Select(r => r.Reason).ToList()
            };
        }
    }
}
