using NLog;
using NzbDrone.Core.Authentication;
using NzbDrone.Core.Configuration;
using NzbDrone.Core.Configuration.Events;
using NzbDrone.Core.Lifecycle;
using NzbDrone.Core.Localization;

namespace NzbDrone.Core.HealthCheck.Checks
{
    // With no login set up, Readarr answers any request that looks local, and /initialize.json hands those
    // requests the API key. A reverse proxy on the same machine or network that doesn't pass on the client
    // address makes every request it forwards look local, so say so at startup and in System > Status.
    [CheckOn(typeof(ApplicationStartedEvent))]
    [CheckOn(typeof(ConfigFileSavedEvent))]
    public class AuthenticationNotSetUpCheck : HealthCheckBase
    {
        private readonly IConfigFileProvider _configFileProvider;
        private readonly Logger _logger;

        public AuthenticationNotSetUpCheck(IConfigFileProvider configFileProvider, ILocalizationService localizationService, Logger logger)
            : base(localizationService)
        {
            _configFileProvider = configFileProvider;
            _logger = logger;
        }

        public override HealthCheck Check()
        {
            if (_configFileProvider.AuthenticationMethod != AuthenticationType.None)
            {
                return new HealthCheck(GetType());
            }

            _logger.Warn("No login is set up. Until one is, the API key is open to any request that looks local, " +
                         "including requests through a reverse proxy that doesn't forward the client's address. " +
                         "Set a username and password in Settings, General, Security.");

            return new HealthCheck(GetType(),
                HealthCheckResult.Error,
                _localizationService.GetLocalizedString("AuthenticationNotSetUpCheckMessage"),
                "#authentication-not-set-up");
        }
    }
}
