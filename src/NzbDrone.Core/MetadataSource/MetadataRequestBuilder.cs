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

        public MetadataRequestBuilder(IConfigService configService)
        {
            _configService = configService;
        }

        // There is no built-in default. Upstream's api.bookinfo.club is gone, and quietly pointing at someone else's
        // server would be a call-home the user never chose, so an unset source fails loudly and MetadataSourceCheck
        // tells the user where to set it.
        public IHttpRequestBuilderFactory GetRequestBuilder()
        {
            var source = _configService.MetadataSource;

            if (source.IsNullOrWhiteSpace())
            {
                throw new MetadataSourceNotConfiguredException();
            }

            return new HttpRequestBuilder(source.Trim().TrimEnd("/") + "/{route}").KeepAlive().CreateFactory();
        }
    }
}
