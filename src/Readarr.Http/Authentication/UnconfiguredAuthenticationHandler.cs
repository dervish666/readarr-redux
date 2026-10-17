using System.Collections.Generic;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NzbDrone.Common.Instrumentation;
using NzbDrone.Core.Authentication;
using NzbDrone.Core.Configuration;
using NzbDrone.Http.Authentication;
using Readarr.Http.Extensions;

namespace Readarr.Http.Authentication
{
    // Authentication method None means nobody has set up a login yet. The UI forces that setup on
    // first load, so a browser on the local network gets in to do it. Anything else is refused,
    // because getting in means /initialize.json, and that hands out the API key.
    public class UnconfiguredAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public const string RefusedMessage = "Readarr has no login set up yet, so it only answers the local network. " +
                                             "Open it from a device on the same network as the server and set a username and password.";

        private static readonly NLog.Logger AppLogger = NzbDroneLogger.GetLogger(typeof(UnconfiguredAuthenticationHandler));
        private static int _warned;

        private readonly IConfigFileProvider _configFileProvider;

        public UnconfiguredAuthenticationHandler(IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder,
            IConfigFileProvider configFileProvider)
            : base(options, logger, encoder)
        {
            _configFileProvider = configFileProvider;
        }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            if (!UiAuthorizationHandler.IsLocalRequest(Context, _configFileProvider.TrustCgnatIpAddresses))
            {
                if (Interlocked.Exchange(ref _warned, 1) == 0)
                {
                    AppLogger.Warn("Refused a request from {0}: no login is set up, so only the local network is answered. Set one up in Settings, General, Security.", Context.GetRemoteIP());
                }
                else
                {
                    AppLogger.Debug("Refused a request from {0}: no login is set up", Context.GetRemoteIP());
                }

                return Task.FromResult(AuthenticateResult.NoResult());
            }

            var claims = new List<Claim>
            {
                new Claim("user", "Anonymous"),
                new Claim("AuthType", AuthenticationType.None.ToString())
            };

            var identity = new ClaimsIdentity(claims, "NoAuth", "user", "identifier");
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, "NoAuth");

            return Task.FromResult(AuthenticateResult.Success(ticket));
        }

        protected override async Task HandleChallengeAsync(AuthenticationProperties properties)
        {
            Response.StatusCode = StatusCodes.Status401Unauthorized;
            Response.ContentType = "text/plain; charset=utf-8";

            await Response.WriteAsync(RefusedMessage);
        }
    }
}
