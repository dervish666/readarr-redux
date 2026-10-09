using System.Net;
using NzbDrone.Core.Exceptions;

namespace NzbDrone.Core.MetadataSource
{
    // Thrown when no metadata source is set. Search error handling passes it through unwrapped so the user sees
    // what to fix instead of a generic "invalid response".
    public class MetadataSourceNotConfiguredException : NzbDroneClientException
    {
        public MetadataSourceNotConfiguredException(string message)
            : base(HttpStatusCode.ServiceUnavailable, message)
        {
        }
    }
}
