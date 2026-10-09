using System.Collections.Generic;
using NzbDrone.Core.Configuration;
using NzbDrone.Core.Configuration.Events;
using NzbDrone.Core.Localization;
using NzbDrone.Core.MetadataSource;

namespace NzbDrone.Core.HealthCheck.Checks
{
    // Probes the source itself rather than watching metadata calls, so it reports a dead source before anything needs it.
    // The probe is cached for a few minutes, which keeps a burst of config saves from turning into a burst of requests.
    [CheckOn(typeof(ConfigSavedEvent))]
    public class MetadataSourceCheck : HealthCheckBase
    {
        private readonly IConfigService _configService;
        private readonly IMetadataSourceProbeService _probeService;

        public MetadataSourceCheck(IConfigService configService, IMetadataSourceProbeService probeService, ILocalizationService localizationService)
            : base(localizationService)
        {
            _configService = configService;
            _probeService = probeService;
        }

        public override HealthCheck Check()
        {
            var result = _probeService.GetCachedProbe(_configService.MetadataSource);

            switch (result.Status)
            {
                case MetadataSourceProbeStatus.Ok:
                    return new HealthCheck(GetType());

                case MetadataSourceProbeStatus.NotConfigured:
                    return new HealthCheck(GetType(),
                        HealthCheckResult.Warning,
                        _localizationService.GetLocalizedString("MetadataSourceCheckNotConfiguredMessage"),
                        "#metadata-source-not-configured");

                // Often passing (an upstream outage, a busy public instance), so these warn where the others are errors
                case MetadataSourceProbeStatus.ServerError:
                case MetadataSourceProbeStatus.RateLimited:
                    return Failure(result, HealthCheckResult.Warning);

                default:
                    return Failure(result, HealthCheckResult.Error);
            }
        }

        private HealthCheck Failure(MetadataSourceProbeResult result, HealthCheckResult type)
        {
            var detail = _localizationService.GetLocalizedString(result.MessageKey, result.MessageTokens);
            var message = _localizationService.GetLocalizedString("MetadataSourceCheckMessage", new Dictionary<string, object> { { "message", detail } });

            return new HealthCheck(GetType(), type, message, "#metadata-source-failed");
        }
    }
}
