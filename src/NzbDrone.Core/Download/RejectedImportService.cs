using System.Collections.Generic;
using System.Linq;
using NLog;
using NzbDrone.Core.Datastore;
using NzbDrone.Core.Download.History;
using NzbDrone.Core.Download.TrackedDownloads;
using NzbDrone.Core.Indexers;
using NzbDrone.Core.MediaFiles.BookImport;

namespace NzbDrone.Core.Download
{
    public interface IRejectedImportService
    {
        bool Process(TrackedDownload trackedDownload, ImportResult importResult);
    }

    // Handles a rejection that covers the whole download rather than one of its files. A dangerous or executable
    // file fails the download when the grabbing indexer's Fail Downloads setting says so, otherwise it's a warning.
    public class RejectedImportService : IRejectedImportService
    {
        private readonly IIndexerFactory _indexerFactory;
        private readonly IDownloadHistoryService _downloadHistoryService;
        private readonly Logger _logger;

        public RejectedImportService(IIndexerFactory indexerFactory,
                                     IDownloadHistoryService downloadHistoryService,
                                     Logger logger)
        {
            _indexerFactory = indexerFactory;
            _downloadHistoryService = downloadHistoryService;
            _logger = logger;
        }

        public bool Process(TrackedDownload trackedDownload, ImportResult importResult)
        {
            if (importResult.Result != ImportResultType.Rejected || importResult.ImportDecision.Item != null)
            {
                return false;
            }

            var statusMessage = new TrackedDownloadStatusMessage(trackedDownload.DownloadItem.Title, importResult.Errors);
            var rejectionReason = importResult.ImportDecision.Rejections.OfType<ImportRejection>().FirstOrDefault()?.RejectionReason;
            var failDownloads = GetFailDownloads(trackedDownload);

            if ((rejectionReason == ImportRejectionReason.DangerousFile && failDownloads.Contains(FailDownloads.PotentiallyDangerous)) ||
                (rejectionReason == ImportRejectionReason.ExecutableFile && failDownloads.Contains(FailDownloads.Executables)))
            {
                _logger.Warn("Failing download {0}: {1}", trackedDownload.DownloadItem.Title, string.Join(", ", importResult.Errors));
                trackedDownload.Fail(statusMessage);
            }
            else
            {
                trackedDownload.State = TrackedDownloadState.ImportFailed;
                trackedDownload.Warn(statusMessage);
            }

            return true;
        }

        private HashSet<FailDownloads> GetFailDownloads(TrackedDownload trackedDownload)
        {
            // The grab history knows the indexer even after a restart, when the tracked download is rebuilt without it
            var indexerId = _downloadHistoryService.GetLatestGrab(trackedDownload.DownloadItem.DownloadId)?.IndexerId ?? 0;

            if (indexerId == 0)
            {
                indexerId = trackedDownload.RemoteBook?.Release?.IndexerId ?? 0;
            }

            if (indexerId == 0)
            {
                _logger.Debug("No indexer known for {0}, not checking its Fail Downloads setting", trackedDownload.DownloadItem.Title);
                return new HashSet<FailDownloads>();
            }

            try
            {
                var settings = _indexerFactory.Get(indexerId).Settings as IIndexerSettings;

                return settings?.FailDownloads?.Select(f => (FailDownloads)f).ToHashSet() ?? new HashSet<FailDownloads>();
            }
            catch (ModelNotFoundException)
            {
                _logger.Debug("Indexer {0} that grabbed {1} no longer exists, not checking its Fail Downloads setting", indexerId, trackedDownload.DownloadItem.Title);
                return new HashSet<FailDownloads>();
            }
        }
    }
}
