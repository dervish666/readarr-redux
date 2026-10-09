using NzbDrone.Common.Exceptions;

namespace NzbDrone.Common.Http
{
    public class HttpResponseTooLargeException : NzbDroneException
    {
        public HttpResponseTooLargeException(HttpRequest request, long maxResponseLength)
            : base("Response from {0} is larger than {1} bytes", request.Url, maxResponseLength)
        {
            MaxResponseLength = maxResponseLength;
        }

        public long MaxResponseLength { get; }
    }
}
