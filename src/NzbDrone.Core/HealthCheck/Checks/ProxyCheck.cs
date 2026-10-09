using System;
using System.Linq;
using System.Net;
using NLog;
using NzbDrone.Common.Extensions;
using NzbDrone.Common.Http;
using NzbDrone.Core.Configuration;
using NzbDrone.Core.Configuration.Events;
using NzbDrone.Core.Localization;
using NzbDrone.Core.MetadataSource;

namespace NzbDrone.Core.HealthCheck.Checks
{
    [CheckOn(typeof(ConfigSavedEvent))]
    public class ProxyCheck : HealthCheckBase
    {
        private readonly Logger _logger;
        private readonly IConfigService _configService;
        private readonly IHttpClient _client;

        private readonly IMetadataRequestBuilder _metadataRequestBuilder;

        public ProxyCheck(IMetadataRequestBuilder metadataRequestBuilder, IConfigService configService, IHttpClient client, ILocalizationService localizationService, Logger logger)
            : base(localizationService)
        {
            _configService = configService;
            _client = client;
            _logger = logger;

            _metadataRequestBuilder = metadataRequestBuilder;
        }

        public override HealthCheck Check()
        {
            if (_configService.ProxyEnabled)
            {
                var addresses = Dns.GetHostAddresses(_configService.ProxyHostname);
                if (!addresses.Any())
                {
                    return new HealthCheck(GetType(), HealthCheckResult.Error, string.Format(_localizationService.GetLocalizedString("ProxyCheckResolveIpMessage"), _configService.ProxyHostname), "#proxy-failed-resolve-ip");
                }

                // With no metadata source there is nothing to test the proxy against, and MetadataSourceCheck already reports it
                if (_configService.MetadataSource.IsNullOrWhiteSpace())
                {
                    return new HealthCheck(GetType());
                }

                // Test the proxy against the metadata source, the one outside host every install needs (upstream pinged readarr.servarr.com)
                var request = _metadataRequestBuilder.GetRequestBuilder()
                                                     .Create()
                                                     .SetSegment("route", "")
                                                     .Build();

                try
                {
                    var response = _client.Execute(request);

                    // We only care about 400 responses, other error codes can be ignored
                    if (response.StatusCode == HttpStatusCode.BadRequest)
                    {
                        _logger.Error("Proxy Health Check failed: {0}", response.StatusCode);
                        return new HealthCheck(GetType(), HealthCheckResult.Error, string.Format(_localizationService.GetLocalizedString("ProxyCheckBadRequestMessage"), response.StatusCode), "#proxy-failed-test");
                    }
                }
                catch (Exception ex)
                {
                    _logger.Error(ex, "Proxy Health Check failed");
                    return new HealthCheck(GetType(), HealthCheckResult.Error, string.Format(_localizationService.GetLocalizedString("ProxyCheckFailedToTestMessage"), request.Url), "#proxy-failed-test");
                }
            }

            return new HealthCheck(GetType());
        }
    }
}
