using NzbDrone.Core.Configuration;
using Readarr.Http.REST;

namespace Prowlarr.Api.V1.Config
{
    // MetadataSource lives on config/metadatasource. Keeping it here let a Development tab opened earlier send the old
    // value back on its next save and quietly revert the source.
    public class DevelopmentConfigResource : RestResource
    {
        public string ConsoleLogLevel { get; set; }
        public bool LogSql { get; set; }
        public int LogRotate { get; set; }
        public bool FilterSentryEvents { get; set; }
    }

    public static class DevelopmentConfigResourceMapper
    {
        public static DevelopmentConfigResource ToResource(this IConfigFileProvider model)
        {
            return new DevelopmentConfigResource
            {
                ConsoleLogLevel = model.ConsoleLogLevel,
                LogSql = model.LogSql,
                LogRotate = model.LogRotate,
                FilterSentryEvents = model.FilterSentryEvents
            };
        }
    }
}
