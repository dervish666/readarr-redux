using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using NzbDrone.Core.Download;
using NzbDrone.Core.Download.Pending;
using NzbDrone.Core.Download.TrackedDownloads;
using NzbDrone.Core.Exceptions;
using NzbDrone.Core.Messaging.Commands;
using NzbDrone.Core.Queue;
using Readarr.Http;
using Readarr.Http.REST;

namespace Readarr.Api.V1.Queue
{
    [V1ApiController("queue")]
    public class QueueActionController : Controller
    {
        private readonly IPendingReleaseService _pendingReleaseService;
        private readonly IDownloadService _downloadService;
        private readonly IQueueService _queueService;
        private readonly ITrackedDownloadService _trackedDownloadService;
        private readonly IImportDestinationService _importDestinationService;
        private readonly IManageCommandQueue _commandQueueManager;

        public QueueActionController(IPendingReleaseService pendingReleaseService,
                                     IDownloadService downloadService,
                                     IQueueService queueService,
                                     ITrackedDownloadService trackedDownloadService,
                                     IImportDestinationService importDestinationService,
                                     IManageCommandQueue commandQueueManager)
        {
            _pendingReleaseService = pendingReleaseService;
            _downloadService = downloadService;
            _queueService = queueService;
            _trackedDownloadService = trackedDownloadService;
            _importDestinationService = importDestinationService;
            _commandQueueManager = commandQueueManager;
        }

        [HttpPost("grab/{id:int}")]
        public async Task<object> Grab(int id)
        {
            var pendingRelease = _pendingReleaseService.FindPendingQueueItem(id);

            if (pendingRelease == null)
            {
                throw new NotFoundException();
            }

            await _downloadService.DownloadReport(pendingRelease.RemoteBook, null);

            return new { };
        }

        [HttpPost("grab/bulk")]
        [Consumes("application/json")]
        public async Task<object> Grab([FromBody] QueueBulkResource resource)
        {
            foreach (var id in resource.Ids)
            {
                var pendingRelease = _pendingReleaseService.FindPendingQueueItem(id);

                if (pendingRelease == null)
                {
                    throw new NotFoundException();
                }

                await _downloadService.DownloadReport(pendingRelease.RemoteBook, null);
            }

            return new { };
        }

        // Retry a download's failed import, optionally past the match threshold or over a file in its way
        [HttpPost("{id:int}/import")]
        [Consumes("application/json")]
        public object Import(int id, [FromBody] QueueImportResource resource)
        {
            var trackedDownload = GetTrackedDownload(id);

            if (!DownloadProcessingService.CanRetryImport(trackedDownload))
            {
                throw new NzbDroneClientException(HttpStatusCode.Conflict, "This download isn't waiting to be imported");
            }

            _commandQueueManager.Push(new ImportQueueItemCommand
            {
                DownloadId = trackedDownload.DownloadItem.DownloadId,
                IgnoreMatchThreshold = resource.IgnoreMatchThreshold,
                ReplaceDestination = resource.ReplaceDestination
            }, trigger: CommandTrigger.Manual);

            return new { };
        }

        // Where each of a download's files would be imported to, and what is already there
        [HttpGet("{id:int}/destinations")]
        [Produces("application/json")]
        public List<QueueImportDestinationResource> GetDestinations(int id)
        {
            var trackedDownload = GetTrackedDownload(id);

            return _importDestinationService.GetDestinations(trackedDownload).Select(d => d.ToResource()).ToList();
        }

        private TrackedDownload GetTrackedDownload(int queueId)
        {
            var queueItem = _queueService.Find(queueId);

            if (queueItem == null)
            {
                throw new NotFoundException();
            }

            var trackedDownload = _trackedDownloadService.Find(queueItem.DownloadId);

            if (trackedDownload == null)
            {
                throw new NotFoundException();
            }

            return trackedDownload;
        }
    }
}
