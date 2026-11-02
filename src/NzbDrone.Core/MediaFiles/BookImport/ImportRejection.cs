using NzbDrone.Core.DecisionEngine;

namespace NzbDrone.Core.MediaFiles.BookImport
{
    public enum ImportRejectionReason
    {
        Unknown,
        DangerousFile,
        ExecutableFile
    }

    // A rejection that carries why, for the rejections completed download handling acts on rather than just reports
    public class ImportRejection : Rejection
    {
        public ImportRejectionReason RejectionReason { get; }

        public ImportRejection(ImportRejectionReason rejectionReason, string reason, RejectionType type = RejectionType.Permanent)
            : base(reason, type)
        {
            RejectionReason = rejectionReason;
        }
    }
}
