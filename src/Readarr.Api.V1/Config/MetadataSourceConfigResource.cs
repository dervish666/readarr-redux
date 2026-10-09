using System;
using NzbDrone.Core.Configuration;
using NzbDrone.Core.Localization;
using NzbDrone.Core.MetadataSource;
using Readarr.Http.REST;

namespace Readarr.Api.V1.Config
{
    public class MetadataSourceConfigResource : RestResource
    {
        public string MetadataSource { get; set; }

        // Only filled in on a save, with the probe of the saved address
        public MetadataSourceProbeResource Probe { get; set; }
    }

    public class MetadataSourceProbeResource
    {
        public string Url { get; set; }
        public MetadataSourceProbeStatus Status { get; set; }
        public int? StatusCode { get; set; }
        public string Message { get; set; }
        public DateTime Time { get; set; }
        public bool IsOk { get; set; }
    }

    public static class MetadataSourceConfigResourceMapper
    {
        public static MetadataSourceConfigResource ToResource(IConfigService model)
        {
            return new MetadataSourceConfigResource
            {
                MetadataSource = model.MetadataSource
            };
        }

        public static MetadataSourceProbeResource ToResource(this MetadataSourceProbeResult model, ILocalizationService localizationService)
        {
            return new MetadataSourceProbeResource
            {
                Url = model.Url,
                Status = model.Status,
                StatusCode = model.StatusCode,
                Message = localizationService.GetLocalizedString(model.MessageKey, model.MessageTokens),
                Time = model.Time,
                IsOk = model.Status == MetadataSourceProbeStatus.Ok
            };
        }
    }
}
