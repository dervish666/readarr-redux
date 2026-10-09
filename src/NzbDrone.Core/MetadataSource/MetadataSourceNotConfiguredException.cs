using System.Net;
using NzbDrone.Core.Exceptions;

namespace NzbDrone.Core.MetadataSource
{
    public class MetadataSourceNotConfiguredException : NzbDroneClientException
    {
        public MetadataSourceNotConfiguredException()
            : base(HttpStatusCode.ServiceUnavailable, "No metadata source is configured. Set one in Settings > Metadata Source.")
        {
        }
    }
}
