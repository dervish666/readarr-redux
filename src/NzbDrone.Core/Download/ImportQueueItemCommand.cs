using NzbDrone.Core.Messaging.Commands;

namespace NzbDrone.Core.Download
{
    // Retries the import of a completed download that failed to import, with the options the user picked
    public class ImportQueueItemCommand : Command
    {
        public string DownloadId { get; set; }
        public bool IgnoreMatchThreshold { get; set; }
        public bool ReplaceDestination { get; set; }

        public override bool SendUpdatesToClient => true;
        public override bool RequiresDiskAccess => true;
    }
}
