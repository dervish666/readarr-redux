using System;
using Microsoft.AspNetCore.Http;
using NLog;
using NzbDrone.Core.Authentication;
using NzbDrone.Core.Configuration;
using Readarr.Http.Extensions;

namespace Readarr.Http.Authentication
{
    public interface IAuthenticationService
    {
        void LogUnauthorized(HttpRequest context);
        User Login(HttpRequest request, string username, string password);
        void Logout(HttpContext context);
    }

    public class AuthenticationService : IAuthenticationService
    {
        private static readonly Logger _authLogger = LogManager.GetLogger("Auth");
        private readonly IUserService _userService;
        private readonly ILoginThrottle _loginThrottle;

        private static AuthenticationType AUTH_METHOD;

        public AuthenticationService(IConfigFileProvider configFileProvider, IUserService userService, ILoginThrottle loginThrottle)
        {
            _userService = userService;
            _loginThrottle = loginThrottle;
            AUTH_METHOD = configFileProvider.AuthenticationMethod;
        }

        public User Login(HttpRequest request, string username, string password)
        {
            if (AUTH_METHOD == AuthenticationType.None)
            {
                return null;
            }

            // Forms and Basic both come through here. The address is the one the forwarded headers
            // middleware resolved from trusted proxies only.
            var clientAddress = request.GetRemoteIP();

            if (!_loginThrottle.TryBeginAttempt(clientAddress, username, out var retryDelay))
            {
                LogThrottled(request, username, retryDelay);

                return null;
            }

            User user;

            try
            {
                user = _userService.FindUser(username, password);
            }
            catch
            {
                _loginThrottle.AbandonAttempt(clientAddress, username);
                throw;
            }

            _loginThrottle.EndAttempt(clientAddress, username, user != null);

            if (user != null)
            {
                LogSuccess(request, username);

                return user;
            }

            LogFailure(request, username);

            return null;
        }

        public void Logout(HttpContext context)
        {
            if (AUTH_METHOD == AuthenticationType.None)
            {
                return;
            }

            if (context.User != null)
            {
                LogLogout(context.Request, context.User.Identity.Name);
            }
        }

        public void LogUnauthorized(HttpRequest context)
        {
            _authLogger.Info("Auth-Unauthorized ip {0} url '{1}'", context.GetRemoteIP(), context.Path);
        }

        private void LogInvalidated(HttpRequest context)
        {
            _authLogger.Info("Auth-Invalidated ip {0}", context.GetRemoteIP());
        }

        private void LogFailure(HttpRequest context, string username)
        {
            _authLogger.Warn("Auth-Failure ip {0} username '{1}'", context.GetRemoteIP(), username);
        }

        private void LogThrottled(HttpRequest context, string username, TimeSpan retryDelay)
        {
            _authLogger.Warn("Auth-Throttled ip {0} username '{1}' retry in {2:0}s", context.GetRemoteIP(), username, Math.Ceiling(retryDelay.TotalSeconds));
        }

        private void LogSuccess(HttpRequest context, string username)
        {
            _authLogger.Info("Auth-Success ip {0} username '{1}'", context.GetRemoteIP(), username);
        }

        private void LogLogout(HttpRequest context, string username)
        {
            _authLogger.Info("Auth-Logout ip {0} username '{1}'", context.GetRemoteIP(), username);
        }
    }
}
