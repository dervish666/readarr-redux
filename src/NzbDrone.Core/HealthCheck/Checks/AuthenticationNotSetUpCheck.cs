using NLog;
using NzbDrone.Core.Authentication;
using NzbDrone.Core.Configuration;
using NzbDrone.Core.Configuration.Events;
using NzbDrone.Core.Lifecycle;
using NzbDrone.Core.Localization;

namespace NzbDrone.Core.HealthCheck.Checks
{
    // With no login set up, the web UI answers only the local network, and until setup is finished it also asks for
    // the one-time setup code from the log, since a reverse proxy on the same machine that doesn't pass on the client
    // address makes every request look local. Running on with no login, by setting AuthenticationNoneConfirmed, drops
    // the code, and then that proxy hands anyone the API key, so say so at startup and in System > Status.
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

            if (!_configFileProvider.AuthenticationNoneConfirmed)
            {
                return new HealthCheck(GetType(),
                    HealthCheckResult.Error,
                    _localizationService.GetLocalizedString("AuthenticationNotSetUpCheckMessage"),
                    "#authentication-not-set-up");
            }

            _logger.Warn("Running with no login, as AuthenticationNoneConfirmed is set. The API key is open to any request that looks local, " +
                         "including requests through a reverse proxy that doesn't forward the client's address.");

            return new HealthCheck(GetType(),
                HealthCheckResult.Warning,
                _localizationService.GetLocalizedString("AuthenticationNoneConfirmedCheckMessage"),
                "#authentication-not-set-up");
        }
    }
}
