using System;
using System.Linq;
using NLog;
using NzbDrone.Common.Instrumentation.Extensions;
using NzbDrone.Core.Configuration;
using NzbDrone.Core.Download.TrackedDownloads;
using NzbDrone.Core.MediaFiles.BookImport;
using NzbDrone.Core.Messaging.Commands;
using NzbDrone.Core.Messaging.Events;

namespace NzbDrone.Core.Download
{
    public class DownloadProcessingService : IExecute<ProcessMonitoredDownloadsCommand>, IExecute<ImportQueueItemCommand>
    {
        private readonly IConfigService _configService;
        private readonly ICompletedDownloadService _completedDownloadService;
        private readonly IFailedDownloadService _failedDownloadService;
        private readonly ITrackedDownloadService _trackedDownloadService;
        private readonly IEventAggregator _eventAggregator;
        private readonly Logger _logger;

        public DownloadProcessingService(IConfigService configService,
                                         ICompletedDownloadService completedDownloadService,
                                         IFailedDownloadService failedDownloadService,
                                         ITrackedDownloadService trackedDownloadService,
                                         IEventAggregator eventAggregator,
                                         Logger logger)
        {
            _configService = configService;
            _completedDownloadService = completedDownloadService;
            _failedDownloadService = failedDownloadService;
            _trackedDownloadService = trackedDownloadService;
            _eventAggregator = eventAggregator;
            _logger = logger;
        }

        private void RemoveCompletedDownloads()
        {
            var trackedDownloads = _trackedDownloadService.GetTrackedDownloads()
                                                          .Where(t => !t.DownloadItem.Removed && t.DownloadItem.CanBeRemoved && t.State == TrackedDownloadState.Imported)
                                                          .ToList();

            foreach (var trackedDownload in trackedDownloads)
            {
                _eventAggregator.PublishEvent(new DownloadCanBeRemovedEvent(trackedDownload));
            }
        }

        public void Execute(ProcessMonitoredDownloadsCommand message)
        {
            var enableCompletedDownloadHandling = _configService.EnableCompletedDownloadHandling;
            var trackedDownloads = _trackedDownloadService.GetTrackedDownloads()
                                                          .Where(t => t.IsTrackable)
                                                          .ToList();

            foreach (var trackedDownload in trackedDownloads)
            {
                try
                {
                    if (trackedDownload.State == TrackedDownloadState.DownloadFailedPending)
                    {
                        _failedDownloadService.ProcessFailed(trackedDownload);
                    }
                    else if (enableCompletedDownloadHandling && trackedDownload.State == TrackedDownloadState.ImportPending)
                    {
                        _completedDownloadService.Import(trackedDownload);
                    }
                }
                catch (Exception e)
                {
                    _logger.Debug(e, "Failed to process download: {0}", trackedDownload.DownloadItem.Title);
                }
            }

            // Imported downloads are no longer trackable so process them after processing trackable downloads
            RemoveCompletedDownloads();

            _eventAggregator.PublishEvent(new DownloadsProcessedEvent());
        }

        public void Execute(ImportQueueItemCommand message)
        {
            var trackedDownload = _trackedDownloadService.Find(message.DownloadId);

            if (trackedDownload == null)
            {
                _logger.Warn("Download {0} is no longer in the queue, not importing it", message.DownloadId);
                return;
            }

            if (!CanRetryImport(trackedDownload))
            {
                _logger.Warn("{0} isn't waiting to be imported, not importing it", trackedDownload.DownloadItem.Title);
                return;
            }

            _logger.ProgressInfo("Importing {0}", trackedDownload.DownloadItem.Title);

            trackedDownload.State = TrackedDownloadState.ImportPending;
            _completedDownloadService.Import(trackedDownload, new DownloadImportOptions
            {
                IgnoreMatchThreshold = message.IgnoreMatchThreshold,
                ReplaceDestination = message.ReplaceDestination
            });

            _eventAggregator.PublishEvent(new DownloadsProcessedEvent());
        }

        public static bool CanRetryImport(TrackedDownload trackedDownload)
        {
            return trackedDownload.DownloadItem.Status == DownloadItemStatus.Completed &&
                   trackedDownload.State is TrackedDownloadState.ImportFailed or TrackedDownloadState.ImportPending;
        }
    }
}
