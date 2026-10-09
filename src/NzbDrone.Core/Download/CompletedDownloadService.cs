using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using NLog;
using NzbDrone.Common.EnvironmentInfo;
using NzbDrone.Common.Extensions;
using NzbDrone.Common.Instrumentation.Extensions;
using NzbDrone.Core.Books;
using NzbDrone.Core.Datastore;
using NzbDrone.Core.Download.TrackedDownloads;
using NzbDrone.Core.History;
using NzbDrone.Core.MediaFiles;
using NzbDrone.Core.MediaFiles.BookImport;
using NzbDrone.Core.MediaFiles.Events;
using NzbDrone.Core.Messaging.Events;

namespace NzbDrone.Core.Download
{
    public interface ICompletedDownloadService
    {
        void Check(TrackedDownload trackedDownload);
        void Import(TrackedDownload trackedDownload);
        bool VerifyImport(TrackedDownload trackedDownload, List<ImportResult> importResults);
        Book GetGrabbedBook(TrackedDownload trackedDownload);
    }

    public class CompletedDownloadService : ICompletedDownloadService
    {
        private readonly IEventAggregator _eventAggregator;
        private readonly IHistoryService _historyService;
        private readonly IBookService _bookService;
        private readonly IProvideImportItemService _provideImportItemService;
        private readonly IDownloadedBooksImportService _downloadedTracksImportService;
        private readonly ITrackedDownloadAlreadyImported _trackedDownloadAlreadyImported;
        private readonly IPartsLeftBehindService _partsLeftBehindService;
        private readonly Logger _logger;

        public CompletedDownloadService(IEventAggregator eventAggregator,
                                        IHistoryService historyService,
                                        IBookService bookService,
                                        IProvideImportItemService provideImportItemService,
                                        IDownloadedBooksImportService downloadedTracksImportService,
                                        ITrackedDownloadAlreadyImported trackedDownloadAlreadyImported,
                                        IPartsLeftBehindService partsLeftBehindService,
                                        Logger logger)
        {
            _eventAggregator = eventAggregator;
            _historyService = historyService;
            _bookService = bookService;
            _provideImportItemService = provideImportItemService;
            _downloadedTracksImportService = downloadedTracksImportService;
            _trackedDownloadAlreadyImported = trackedDownloadAlreadyImported;
            _partsLeftBehindService = partsLeftBehindService;
            _logger = logger;
        }

        public void Check(TrackedDownload trackedDownload)
        {
            if (trackedDownload.DownloadItem.Status != DownloadItemStatus.Completed)
            {
                return;
            }

            SetImportItem(trackedDownload);

            // Only process tracked downloads that are still downloading
            if (trackedDownload.State != TrackedDownloadState.Downloading)
            {
                return;
            }

            var historyItem = _historyService.MostRecentForDownloadId(trackedDownload.DownloadItem.DownloadId);

            if (historyItem == null && trackedDownload.DownloadItem.Category.IsNullOrWhiteSpace())
            {
                trackedDownload.Warn("Download wasn't grabbed by Readarr and not in a category, Skipping.");
                return;
            }

            if (!ValidatePath(trackedDownload))
            {
                return;
            }

            trackedDownload.State = TrackedDownloadState.ImportPending;
        }

        public void Import(TrackedDownload trackedDownload)
        {
            SetImportItem(trackedDownload);

            if (!ValidatePath(trackedDownload))
            {
                return;
            }

            Book grabbedBook;

            try
            {
                grabbedBook = GetGrabbedBook(trackedDownload);
            }
            catch (GrabbedBookNotFoundException e)
            {
                trackedDownload.State = TrackedDownloadState.ImportFailed;
                trackedDownload.Warn(e.Message);
                return;
            }

            trackedDownload.State = TrackedDownloadState.Importing;

            var outputPath = trackedDownload.ImportItem.OutputPath.FullPath;
            var importResults = _downloadedTracksImportService.ProcessPath(outputPath, ImportMode.Auto, trackedDownload.RemoteBook?.Author, trackedDownload.DownloadItem, grabbedBook);

            if (importResults.Empty())
            {
                trackedDownload.Warn("No files found are eligible for import in {0}", outputPath);
                trackedDownload.State = TrackedDownloadState.ImportPending;
                return;
            }

            if (VerifyImport(trackedDownload, importResults))
            {
                return;
            }

            trackedDownload.State = TrackedDownloadState.ImportPending;

            if (importResults.Any(c => c.Result != ImportResultType.Imported))
            {
                trackedDownload.State = TrackedDownloadState.ImportFailed;
                var statusMessages = importResults
                    .Where(v => v.Result != ImportResultType.Imported && v.ImportDecision.Item != null)
                    .Select(v => new TrackedDownloadStatusMessage(Path.GetFileName(v.ImportDecision.Item.Path), v.Errors))
                    .ToArray();

                trackedDownload.Warn(statusMessages);
                _eventAggregator.PublishEvent(new BookImportIncompleteEvent(trackedDownload));
                return;
            }
        }

        // The book this download was grabbed for, taken from the grab history rather than a fresh parse of the
        // download title, which can map to a different book. Null when there's no grab history or the latest grab
        // was for several books. Throws when the grabbed book is gone or now belongs to another author, because
        // matching the files freely could then land them on a neighbouring book.
        public Book GetGrabbedBook(TrackedDownload trackedDownload)
        {
            var downloadId = trackedDownload.DownloadItem?.DownloadId;

            if (downloadId.IsNullOrWhiteSpace())
            {
                return null;
            }

            // A reused torrent hash or a retried grab leaves several grabs, and the newest says what this download is.
            // One grab of a release covering several books writes a row per book, moments apart.
            var grabs = _historyService.FindGrabsByDownloadId(downloadId);
            var latest = grabs.MaxBy(h => h.Date);

            if (latest == null)
            {
                return null;
            }

            var bookIds = grabs.Where(h => h.SourceTitle == latest.SourceTitle && h.Date >= latest.Date.AddMinutes(-1))
                .Select(h => h.BookId)
                .Distinct()
                .ToList();

            if (bookIds.Count != 1)
            {
                _logger.Debug("Download {0} was grabbed for {1} books, not pinning its import to one", downloadId, bookIds.Count);
                return null;
            }

            Book book;

            try
            {
                book = _bookService.GetBook(bookIds[0]);
            }
            catch (ModelNotFoundException)
            {
                throw new GrabbedBookNotFoundException("The book this download was grabbed for (id {0}) no longer exists, manual import required", bookIds[0]);
            }

            var author = trackedDownload.RemoteBook?.Author;

            if (author != null && book.AuthorMetadataId != author.AuthorMetadataId)
            {
                throw new GrabbedBookNotFoundException("The book this download was grabbed for ({0}) now belongs to another author, manual import required", book);
            }

            return book;
        }

        public bool VerifyImport(TrackedDownload trackedDownload, List<ImportResult> importResults)
        {
            // A part of an audiobook that didn't import is still in the download folder, and calling the download
            // imported lets the client's remove-completed delete it. Checked before history, which only knows that
            // some file of the book imported.
            var leftBehind = _partsLeftBehindService.PartsLeftBehind(importResults);

            if (leftBehind.Any())
            {
                _logger.Warn("Not all parts imported for {0}, keeping the download until they are: {1}",
                    trackedDownload.DownloadItem.Title,
                    leftBehind.Select(Path.GetFileName).ConcatToString(", "));

                return false;
            }

            var allItemsImported = importResults.Where(c => c.Result == ImportResultType.Imported)
                                                   .Select(c => c.ImportDecision.Item.Book)
                                                   .Count() >= Math.Max(1, trackedDownload.RemoteBook?.Books.Count ?? 1);

            if (allItemsImported)
            {
                _logger.Debug("All books were imported for {0}", trackedDownload.DownloadItem.Title);
                trackedDownload.State = TrackedDownloadState.Imported;

                var importedAuthorId = importResults.Where(x => x.Result == ImportResultType.Imported)
                    .Select(c => c.ImportDecision.Item.Author.Id)
                    .MostCommon();
                _eventAggregator.PublishEvent(new DownloadCompletedEvent(trackedDownload, trackedDownload.RemoteBook?.Author.Id ?? importedAuthorId));
                return true;
            }

            // Double check if all episodes were imported by checking the history if at least one
            // file was imported. This will allow the decision engine to reject already imported
            // episode files and still mark the download complete when all files are imported.

            // EDGE CASE: This process relies on EpisodeIds being consistent between executions, if a series is updated
            // and an episode is removed, but later comes back with a different ID then Sonarr will treat it as incomplete.
            // Since imports should be relatively fast and these types of data changes are infrequent this should be quite
            // safe, but commenting for future benefit.
            var atLeastOneEpisodeImported = importResults.Any(c => c.Result == ImportResultType.Imported);

            var historyItems = _historyService.FindByDownloadId(trackedDownload.DownloadItem.DownloadId)
                                              .OrderByDescending(h => h.Date)
                                              .ToList();

            var allEpisodesImportedInHistory = _trackedDownloadAlreadyImported.IsImported(trackedDownload, historyItems);

            if (allEpisodesImportedInHistory)
            {
                // Log different error messages depending on the circumstances, but treat both as fully imported, because that's the reality.
                // The second message shouldn't be logged in most cases, but continued reporting would indicate an ongoing issue.
                if (atLeastOneEpisodeImported)
                {
                    _logger.Debug("All books were imported in history for {0}", trackedDownload.DownloadItem.Title);
                }
                else
                {
                    _logger.ForDebugEvent()
                           .Message("No books were just imported, but all books were previously imported, possible issue with download history.")
                           .Property("AuthorId", trackedDownload.RemoteBook.Author.Id)
                           .Property("DownloadId", trackedDownload.DownloadItem.DownloadId)
                           .Property("Title", trackedDownload.DownloadItem.Title)
                           .Property("Path", trackedDownload.DownloadItem.OutputPath.ToString())
                           .WriteSentryWarn("DownloadHistoryIncomplete")
                           .Log();
                }

                trackedDownload.State = TrackedDownloadState.Imported;

                var importedAuthorId = historyItems.Where(x => x.EventType == EntityHistoryEventType.BookFileImported)
                    .Select(x => x.AuthorId)
                    .MostCommon();
                _eventAggregator.PublishEvent(new DownloadCompletedEvent(trackedDownload, trackedDownload.RemoteBook?.Author.Id ?? importedAuthorId));

                return true;
            }

            _logger.Debug("Not all books have been imported for {0}", trackedDownload.DownloadItem.Title);
            return false;
        }

        private void SetImportItem(TrackedDownload trackedDownload)
        {
            trackedDownload.ImportItem = _provideImportItemService.ProvideImportItem(trackedDownload.DownloadItem, trackedDownload.ImportItem);
        }

        private bool ValidatePath(TrackedDownload trackedDownload)
        {
            var downloadItemOutputPath = trackedDownload.ImportItem.OutputPath;

            if (downloadItemOutputPath.IsEmpty)
            {
                trackedDownload.Warn("Download doesn't contain intermediate path, Skipping.");
                return false;
            }

            if ((OsInfo.IsWindows && !downloadItemOutputPath.IsWindowsPath) ||
                (OsInfo.IsNotWindows && !downloadItemOutputPath.IsUnixPath))
            {
                trackedDownload.Warn("[{0}] is not a valid local path. You may need a Remote Path Mapping.", downloadItemOutputPath);
                return false;
            }

            return true;
        }
    }
}
