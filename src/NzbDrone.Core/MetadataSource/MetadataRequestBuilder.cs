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
        // Stephen King's author payload from rreading-glasses is about 7 MB, so this leaves room for bigger
        // authors while stopping a broken or hostile source from filling memory with one response
        public const long MaxResponseLength = 64 * 1024 * 1024;

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

            // Spaces out bursts such as a full refresh, which otherwise reach rreading-glasses as fast as it answers
            var builder = new HttpRequestBuilder(source.Trim().TrimEnd("/") + "/{route}").KeepAlive().WithRateLimit(0.25);

            // Counted after decompression, so a small compressed body can't expand past it either
            builder.PostProcess += r => r.MaxResponseLength ??= MaxResponseLength;

            return builder.CreateFactory();
        }
    }
}
