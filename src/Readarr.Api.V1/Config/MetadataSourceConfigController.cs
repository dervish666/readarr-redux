using System.Collections.Generic;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using NzbDrone.Common.Extensions;
using NzbDrone.Core.Configuration;
using NzbDrone.Core.Localization;
using NzbDrone.Core.MetadataSource;
using NzbDrone.Core.Validation;
using NzbDrone.Http.REST.Attributes;
using Readarr.Http;

namespace Readarr.Api.V1.Config
{
    [V1ApiController("config/metadatasource")]
    public class MetadataSourceConfigController : ConfigController<MetadataSourceConfigResource>
    {
        private readonly IMetadataSourceProbeService _probeService;
        private readonly ILocalizationService _localizationService;

        public MetadataSourceConfigController(IConfigService configService,
                                              IMetadataSourceProbeService probeService,
                                              ILocalizationService localizationService)
            : base(configService)
        {
            _probeService = probeService;
            _localizationService = localizationService;

            SharedValidator.RuleFor(c => c.MetadataSource).IsValidUrl().When(c => !c.MetadataSource.IsNullOrWhiteSpace());
        }

        protected override MetadataSourceConfigResource ToResource(IConfigService model)
        {
            return MetadataSourceConfigResourceMapper.ToResource(model);
        }

        // Only a malformed URL blocks the save. A source that fails the probe still saves, so an offline or
        // not-yet-running source can be set up, and the probe comes back in the response as a warning.
        [RestPutById]
        public override ActionResult<MetadataSourceConfigResource> SaveConfig(MetadataSourceConfigResource resource)
        {
            var source = resource.MetadataSource?.Trim() ?? string.Empty;

            // Probe before saving. The save fires ConfigSavedEvent, and MetadataSourceCheck then reuses this cached
            // result instead of calling the source a second time.
            var probe = _probeService.Probe(source);

            _configService.SaveConfigDictionary(new Dictionary<string, object> { { nameof(IConfigService.MetadataSource), source } });

            var result = GetConfig();
            result.Probe = probe.ToResource(_localizationService);

            return AcceptedAtAction(nameof(GetResourceByIdWithErrorHandler), new { id = result.Id }, result);
        }

        [HttpPost("test")]
        [SkipValidation(true, true)]
        public MetadataSourceProbeResource Test([FromBody] MetadataSourceConfigResource resource)
        {
            return _probeService.Probe(resource.MetadataSource).ToResource(_localizationService);
        }
    }
}
