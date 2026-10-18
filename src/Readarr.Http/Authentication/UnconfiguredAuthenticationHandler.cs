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
    // because getting in means /initialize.json, and that hands out the API key. Being local isn't
    // enough on its own either: a reverse proxy on the same machine that sends no X-Forwarded-For
    // makes every request look like loopback. So until setup is finished a browser also has to enter
    // the one-time setup code from the log (SetupCodeController), which leaves it a cookie.
    public class UnconfiguredAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public const string SetupCookieName = "ReadarrSetup";

        public const string SetupCodeMessage = "Readarr has no login set up yet. To get in, enter the one-time setup code " +
                                               "that Readarr wrote to its log and console when it started " +
                                               "(docker logs readarr, or logs/readarr.txt in the app data folder). " +
                                               "It changes on every restart.";

        private const string SetupCodeRequiredItem = "Readarr.SetupCodeRequired";

        public const string RefusedMessage = "Readarr has no login set up yet, so it only answers requests from the local network.\n\n" +
                                             "To get in, open Readarr at the server's own address and port from a device on the same network, " +
                                             "not through a public proxy, or through an SSH tunnel to the server " +
                                             "(ssh -L 8787:localhost:8787 user@server, then http://localhost:8787). " +
                                             "Set a username and password when asked, and this address works again.\n\n" +
                                             "If a reverse proxy already handles login for you, set AuthenticationMethod to External in config.xml and restart Readarr.";

        private static readonly NLog.Logger AppLogger = NzbDroneLogger.GetLogger(typeof(UnconfiguredAuthenticationHandler));
        private static int _warned;

        private readonly IConfigFileProvider _configFileProvider;
        private readonly ISetupCodeService _setupCodeService;

        public UnconfiguredAuthenticationHandler(IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder,
            IConfigFileProvider configFileProvider,
            ISetupCodeService setupCodeService)
            : base(options, logger, encoder)
        {
            _configFileProvider = configFileProvider;
            _setupCodeService = setupCodeService;
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

            if (_setupCodeService.IsRequired && !_setupCodeService.IsValidProof(Request.Cookies[SetupCookieName]))
            {
                Context.Items[SetupCodeRequiredItem] = true;

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

            if (!Context.Items.ContainsKey(SetupCodeRequiredItem))
            {
                Response.ContentType = "text/plain; charset=utf-8";
                await Response.WriteAsync(RefusedMessage);
                return;
            }

            if (IsBrowserPageRequest())
            {
                Response.ContentType = "text/html; charset=utf-8";
                await Response.WriteAsync(SetupCodePage(_configFileProvider.UrlBase, Request.Query.ContainsKey("setupCodeFailed")));
                return;
            }

            Response.ContentType = "text/plain; charset=utf-8";
            await Response.WriteAsync(SetupCodeMessage);
        }

        private bool IsBrowserPageRequest()
        {
            return HttpMethods.IsGet(Request.Method) &&
                   !string.Equals(Request.Headers.XRequestedWith, "XMLHttpRequest", System.StringComparison.Ordinal) &&
                   Request.Headers.Accept.ToString().Contains("text/html");
        }

        // A page of its own, as the UI can't load before the browser is let in
        public static string SetupCodePage(string urlBase, bool failed)
        {
            var action = HtmlEncoder.Default.Encode((urlBase ?? string.Empty) + "/setup/code");
            var error = failed ? "<p class=\"error\">That code isn't right. Check the latest one in the log, the code changes on every restart.</p>" : string.Empty;

            return "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
                   "<title>Readarr setup code</title><style>body{font-family:sans-serif;max-width:32em;margin:4em auto;padding:0 1em;line-height:1.5}" +
                   "input{font-size:1.2em;padding:.3em;letter-spacing:.1em}button{font-size:1.1em;padding:.4em 1em}.error{color:#c00}</style></head><body>" +
                   "<h1>Readarr setup code</h1><p>" + HtmlEncoder.Default.Encode(SetupCodeMessage) + "</p>" + error +
                   "<form method=\"post\" action=\"" + action + "\"><input name=\"code\" autocomplete=\"off\" autofocus required " +
                   "placeholder=\"XXXX-XXXX-XXXX\" aria-label=\"Setup code\"> <button type=\"submit\">Continue</button></form></body></html>";
        }
    }
}
