using NzbDrone.Core.DecisionEngine;

namespace NzbDrone.Core.MediaFiles.BookImport
{
    // A rejection that means the file is not wanted, as opposed to one that means it could not be handled.
    // Completed download handling treats a rejected audio file as dealt with only when every rejection on it
    // is one of these; a parse failure, an error or any other rejection leaves the file behind.
    public class DeliberateRejection : Rejection
    {
        public DeliberateRejection(string reason)
            : base(reason, RejectionType.Permanent)
        {
        }
    }

    // Marks an import specification whose rejections are deliberate: not an upgrade, already in the library,
    // already imported from this download, or tagged for a different book.
    public interface IRejectsDeliberately
    {
    }
}
