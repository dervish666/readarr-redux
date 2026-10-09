using NzbDrone.Common.Cloud;
using NzbDrone.Common.Extensions;
using NzbDrone.Common.Http;
using NzbDrone.Core.Configuration;

namespace NzbDrone.Core.MetadataSource
{
    public interface IMetadataRequestBuilder
    {
        IHttpRequestBuilderFactory GetRequestBuilder();
    }

    public class MetadataRequestBuilder : IMetadataRequestBuilder
    {
        private readonly IConfigService _configService;

        private readonly IReadarrCloudRequestBuilder _defaultRequestFactory;

        public MetadataRequestBuilder(IConfigService configService, IReadarrCloudRequestBuilder defaultRequestBuilder)
        {
            _configService = configService;
            _defaultRequestFactory = defaultRequestBuilder;
        }

        public IHttpRequestBuilderFactory GetRequestBuilder()
        {
            if (_configService.MetadataSource.IsNotNullOrWhiteSpace())
            {
                // Spaces out bursts such as a full refresh, which otherwise reach rreading-glasses as fast as it answers
                return new HttpRequestBuilder(_configService.MetadataSource.TrimEnd("/") + "/{route}").KeepAlive().WithRateLimit(0.25).CreateFactory();
            }
            else
            {
                return _defaultRequestFactory.Metadata;
            }
        }
    }
}
