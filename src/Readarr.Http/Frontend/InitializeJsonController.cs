using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NzbDrone.Common;
using NzbDrone.Common.EnvironmentInfo;
using NzbDrone.Common.Serializer;
using NzbDrone.Core.Analytics;
using NzbDrone.Core.Configuration;

namespace Readarr.Http.Frontend
{
    [Authorize(Policy = "UI")]
    [ApiController]
    [ApiExplorerSettings(IgnoreApi = true)]
    public class InitializeJsonController : Controller
    {
        private readonly IConfigFileProvider _configFileProvider;
        private readonly IAnalyticsService _analyticsService;

        private static string _apiKey;
        private static string _urlBase;
        private string _generatedContent;

        public InitializeJsonController(IConfigFileProvider configFileProvider,
                                      IAnalyticsService analyticsService)
        {
            _configFileProvider = configFileProvider;
            _analyticsService = analyticsService;

            _apiKey = configFileProvider.ApiKey;
            _urlBase = configFileProvider.UrlBase;
        }

        [HttpGet("/initialize.json")]
        public IActionResult Index()
        {
            return Content(GetContent(), "application/json");
        }

        private string GetContent()
        {
            if (RuntimeInfo.IsProduction && _generatedContent != null)
            {
                return _generatedContent;
            }

            _generatedContent = STJson.ToJson(new
            {
                apiRoot = $"{_urlBase}/api/v1",
                apiKey = _apiKey,
                release = BuildInfo.Release,
                version = BuildInfo.Version.ToString(),
                instanceName = _configFileProvider.InstanceName,
                theme = _configFileProvider.Theme,
                branch = _configFileProvider.Branch.ToLowerInvariant(),
                analytics = _analyticsService.IsEnabled,
                userHash = HashUtil.AnonymousToken(),
                urlBase = _urlBase,
                isProduction = RuntimeInfo.IsProduction
            });

            return _generatedContent;
        }
    }
}
