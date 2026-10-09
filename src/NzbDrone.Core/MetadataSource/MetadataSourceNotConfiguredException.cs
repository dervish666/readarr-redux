using System.Net;
using NzbDrone.Core.Exceptions;

namespace NzbDrone.Core.MetadataSource
{
    // Thrown by MetadataRequestBuilder when no metadata source is set. Search error handling passes it through
    // unwrapped so the user sees what to fix instead of a generic "invalid response".
    public class MetadataSourceNotConfiguredException : NzbDroneClientException
    {
        public MetadataSourceNotConfiguredException()
            : this("No metadata source is configured. Set one in Settings > Metadata Source.")
        {
        }

        public MetadataSourceNotConfiguredException(string message)
            : base(HttpStatusCode.ServiceUnavailable, message)
        {
        }
    }
}
