using System;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using NzbDrone.Common.Extensions;
using NzbDrone.Core.Authentication;
using NzbDrone.Core.Configuration;
using NzbDrone.Core.Configuration.Events;
using NzbDrone.Core.Messaging.Events;
using Readarr.Http.Extensions;

namespace NzbDrone.Http.Authentication
{
    public class UiAuthorizationHandler : AuthorizationHandler<BypassableDenyAnonymousAuthorizationRequirement>, IAuthorizationRequirement, IHandle<ConfigSavedEvent>
    {
        // Headers that mean a proxy sits between us and the client. X-Forwarded-For is removed once
        // the forwarded headers middleware has resolved every hop through trusted proxies, so it is
        // only still here when the client address is unknown. The others are never resolved: a
        // Forwarded header we don't parse, or a request that came in through Cloudflare (a tunnel
        // connector on the LAN would otherwise look local when visitor IP headers are stripped).
        private static readonly string[] UnresolvedProxyHeaders =
        {
            ForwardedHeadersDefaults.XForwardedForHeaderName,
            "Forwarded",
            "CF-Connecting-IP",
            "CF-Ray",
            "CDN-Loop"
        };

        private readonly IConfigFileProvider _configService;
        private static AuthenticationRequiredType _authenticationRequired;

        public UiAuthorizationHandler(IConfigFileProvider configService)
        {
            _configService = configService;
            _authenticationRequired = configService.AuthenticationRequired;
        }

        protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, BypassableDenyAnonymousAuthorizationRequirement requirement)
        {
            if (_authenticationRequired == AuthenticationRequiredType.DisabledForLocalAddresses &&
                context.Resource is HttpContext httpContext &&
                IsLocalRequest(httpContext, _configService.TrustCgnatIpAddresses) &&
                IsLocalHostName(httpContext.Request.Host.Host))
            {
                context.Succeed(requirement);
            }

            return Task.CompletedTask;
        }

        // A local client address alone does not prevent DNS rebinding.
        // Restrict the bypass to local host names and IP literals.
        public static bool IsLocalHostName(string host)
        {
            if (string.IsNullOrEmpty(host))
            {
                return false;
            }

            if (host.EndsWith(".", StringComparison.Ordinal))
            {
                host = host.Substring(0, host.Length - 1);
            }

            return host.Length > 0 &&
                   (IPAddress.TryParse(host, out _) ||
                    !host.Contains('.') ||
                    host.EndsWith(".local", StringComparison.OrdinalIgnoreCase) ||
                    host.EndsWith(".lan", StringComparison.OrdinalIgnoreCase) ||
                    host.EndsWith(".home.arpa", StringComparison.OrdinalIgnoreCase) ||
                    host.EndsWith(".internal", StringComparison.OrdinalIgnoreCase));
        }

        public static bool IsLocalRequest(HttpContext httpContext, bool trustCgnatIpAddresses)
        {
            if (!IsClientAddressKnown(httpContext) ||
                !IPAddress.TryParse(httpContext.GetRemoteIP(), out var ipAddress))
            {
                return false;
            }

            return ipAddress.IsLocalAddress() ||
                   (trustCgnatIpAddresses && ipAddress.IsCgnatIpAddress());
        }

        private static bool IsClientAddressKnown(HttpContext httpContext)
        {
            return !UnresolvedProxyHeaders.Any(h => httpContext.Request.Headers.ContainsKey(h));
        }

        public void Handle(ConfigSavedEvent message)
        {
            _authenticationRequired = _configService.AuthenticationRequired;
        }
    }
}
