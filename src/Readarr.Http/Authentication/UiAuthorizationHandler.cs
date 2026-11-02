using System;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.HostFiltering;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
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
        private const string OriginalHostItemKey = "Readarr.OriginalHost";

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
        private readonly IOptionsMonitor<HostFilteringOptions> _hostFilteringOptions;
        private static AuthenticationRequiredType _authenticationRequired;

        public UiAuthorizationHandler(IConfigFileProvider configService, IOptionsMonitor<HostFilteringOptions> hostFilteringOptions)
        {
            _configService = configService;
            _hostFilteringOptions = hostFilteringOptions;
            _authenticationRequired = configService.AuthenticationRequired;
        }

        // Runs before the forwarded headers middleware. A page in a browser inside Trusted Networks can send its own
        // X-Forwarded-Host, so the host the bypass is judged on is the one the request arrived with. The browser
        // sets that from the address it loaded and script can't change it.
        public static void RecordOriginalHost(HttpContext httpContext)
        {
            httpContext.Items[OriginalHostItemKey] = httpContext.Request.Host;
        }

        protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, BypassableDenyAnonymousAuthorizationRequirement requirement)
        {
            if (_authenticationRequired == AuthenticationRequiredType.DisabledForLocalAddresses &&
                context.Resource is HttpContext httpContext &&
                IsLocalRequest(httpContext, _configService.TrustCgnatIpAddresses) &&
                httpContext.Items.TryGetValue(OriginalHostItemKey, out var item) &&
                item is HostString originalHost &&
                (IsAllowedHost(originalHost) || IsLocalHostName(originalHost.Host)))
            {
                context.Succeed(requirement);
            }

            return Task.CompletedTask;
        }

        // Asks the options the host filtering middleware runs with, not the saved Allowed Hosts, since a change to
        // that only takes effect after a restart. Matched the way the middleware matches, but against the host the
        // request arrived with rather than the forwarded one the middleware checked.
        private bool IsAllowedHost(HostString host)
        {
            var allowedHosts = _hostFilteringOptions?.CurrentValue?.AllowedHosts;

            if (allowedHosts == null || allowedHosts.Count == 0 || allowedHosts.Contains("*") || !host.HasValue)
            {
                return false;
            }

            var patterns = allowedHosts.Select(h => new StringSegment(new HostString(h).ToUriComponent())).ToList();

            return HostString.MatchesAny(new StringSegment(host.Value), patterns);
        }

        // A local client address alone does not prevent DNS rebinding, so the bypass also needs a host the
        // request arrived with that is in Allowed Hosts, or a local host name or IP literal.
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
