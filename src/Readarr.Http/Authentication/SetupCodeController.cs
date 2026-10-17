using System;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NLog;
using NzbDrone.Core.Authentication;
using NzbDrone.Core.Configuration;
using NzbDrone.Http.Authentication;
using Readarr.Http.Extensions;

namespace Readarr.Http.Authentication
{
    // Takes the one-time setup code from the page UnconfiguredAuthenticationHandler shows while no login is set up.
    // A right code leaves a cookie that lets this browser in until Readarr restarts or setup is finished.
    [AllowAnonymous]
    [ApiController]
    public class SetupCodeController : Controller
    {
        private const string ThrottleKey = "setup-code";

        private readonly ISetupCodeService _setupCodeService;
        private readonly IConfigFileProvider _configFileProvider;
        private readonly ILoginThrottle _loginThrottle;
        private readonly Logger _logger;

        public SetupCodeController(ISetupCodeService setupCodeService, IConfigFileProvider configFileProvider, ILoginThrottle loginThrottle, Logger logger)
        {
            _setupCodeService = setupCodeService;
            _configFileProvider = configFileProvider;
            _loginThrottle = loginThrottle;
            _logger = logger;
        }

        [HttpPost("setup/code")]
        public IActionResult EnterCode([FromForm] string code)
        {
            var home = _configFileProvider.UrlBase + "/";

            if (!_setupCodeService.IsRequired)
            {
                return Redirect(home);
            }

            // The handler refuses these whatever the code, so don't let them guess at it either
            if (!UiAuthorizationHandler.IsLocalRequest(HttpContext, _configFileProvider.TrustCgnatIpAddresses))
            {
                return Unauthorized(UnconfiguredAuthenticationHandler.RefusedMessage);
            }

            var clientAddress = HttpContext.GetRemoteIP();

            if (!_loginThrottle.TryBeginAttempt(clientAddress, ThrottleKey, out var retryDelay))
            {
                Response.Headers.RetryAfter = Math.Ceiling(retryDelay.TotalSeconds).ToString();
                return StatusCode(StatusCodes.Status429TooManyRequests, "Too many wrong setup codes, wait and try again");
            }

            var proof = _setupCodeService.Verify(code);

            _loginThrottle.EndAttempt(clientAddress, ThrottleKey, proof != null);

            if (proof == null)
            {
                _logger.Warn("Wrong setup code from {0}", clientAddress);
                return Redirect(home + "?setupCodeFailed=true");
            }

            _logger.Info("Setup code accepted from {0}", clientAddress);

            Response.Cookies.Append(UnconfiguredAuthenticationHandler.SetupCookieName, proof, new CookieOptions
            {
                HttpOnly = true,
                SameSite = SameSiteMode.Strict,
                Secure = Request.IsHttps,
                Path = string.IsNullOrWhiteSpace(_configFileProvider.UrlBase) ? "/" : _configFileProvider.UrlBase
            });

            return Redirect(home);
        }
    }
}
