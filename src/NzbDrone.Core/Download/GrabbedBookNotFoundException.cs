using NzbDrone.Common.Exceptions;

namespace NzbDrone.Core.Download
{
    // The download was grabbed for a book that is no longer in the library as it was. Matching its files freely
    // could put them on another book, so it waits for a manual import instead.
    public class GrabbedBookNotFoundException : NzbDroneException
    {
        public GrabbedBookNotFoundException(string message, params object[] args)
            : base(message, args)
        {
        }
    }
}
