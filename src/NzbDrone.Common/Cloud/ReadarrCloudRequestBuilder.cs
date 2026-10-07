using NzbDrone.Common.Http;

namespace NzbDrone.Common.Cloud
{
    // Upstream also exposed a Services builder for readarr.servarr.com (updates, server notifications, time and proxy
    // checks). The fork calls none of those, so it is gone and nothing can reach that host by accident.
    public interface IReadarrCloudRequestBuilder
    {
        IHttpRequestBuilderFactory Metadata { get; }
    }

    public class ReadarrCloudRequestBuilder : IReadarrCloudRequestBuilder
    {
        public ReadarrCloudRequestBuilder()
        {
            Metadata = new HttpRequestBuilder("https://api.bookinfo.club/v1/{route}")
                .CreateFactory();
        }

        public IHttpRequestBuilderFactory Metadata { get; }
    }
}
