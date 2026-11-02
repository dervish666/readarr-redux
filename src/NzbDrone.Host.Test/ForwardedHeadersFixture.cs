using System.Net;
using System.Security.Claims;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HostFiltering;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using NUnit.Framework;
using NzbDrone.Core.Authentication;
using NzbDrone.Core.Configuration;
using NzbDrone.Host;
using NzbDrone.Http.Authentication;
using NzbDrone.Test.Common;

namespace NzbDrone.App.Test
{
    // Runs the real forwarded headers middleware with Readarr's options, then the
    // "Disabled for Local Addresses" check, the way a request reaches it behind a proxy.
    [TestFixture]
    public class ForwardedHeadersFixture : TestBase<UiAuthorizationHandler>
    {
        private const string CloudflaredPeer = "192.168.0.20";
        private const string InternetClient = "203.0.113.5";

        [SetUp]
        public void Setup()
        {
            Mocker.GetMock<IConfigFileProvider>()
                  .SetupGet(c => c.AuthenticationRequired)
                  .Returns(AuthenticationRequiredType.DisabledForLocalAddresses);
        }

        private static HttpContext Send(string peer, string forwardedFor, params (string Name, string Value)[] headers)
        {
            return SendWithTrustedNetworks(ConfigFileProvider.LegacyTrustedNetworks, "192.168.0.190:8787", peer, forwardedFor, headers);
        }

        private static HttpContext SendWithTrustedNetworks(string trustedNetworks, string host, string peer, string forwardedFor, params (string Name, string Value)[] headers)
        {
            var configFileProvider = new Mock<IConfigFileProvider>();
            configFileProvider.SetupGet(c => c.TrustedNetworks).Returns(trustedNetworks);

            var options = new ForwardedHeadersOptions();
            ForwardedHeadersConfigurator.Configure(options, configFileProvider.Object);

            var middleware = new ForwardedHeadersMiddleware(_ => Task.CompletedTask, NullLoggerFactory.Instance, Options.Create(options));

            var httpContext = new DefaultHttpContext();
            httpContext.Connection.RemoteIpAddress = IPAddress.Parse(peer);
            httpContext.Request.Host = new HostString(host);

            if (forwardedFor != null)
            {
                httpContext.Request.Headers[ForwardedHeadersDefaults.XForwardedForHeaderName] = forwardedFor;
            }

            foreach (var (name, value) in headers)
            {
                httpContext.Request.Headers[name] = value;
            }

            // As in Startup, ahead of the forwarded headers middleware
            UiAuthorizationHandler.RecordOriginalHost(httpContext);
            middleware.Invoke(httpContext).GetAwaiter().GetResult();

            return httpContext;
        }

        private static (string, string)[] CloudflareHeaders(string client)
        {
            return new[] { ("CF-Connecting-IP", client), ("CF-Ray", "8c1a2b3c4d5e6f70-LHR"), ("CDN-Loop", "cloudflare") };
        }

        private bool IsAuthorized(HttpContext httpContext)
        {
            var requirement = new BypassableDenyAnonymousAuthorizationRequirement();
            var context = new AuthorizationHandlerContext(new[] { requirement }, new ClaimsPrincipal(), httpContext);

            Subject.HandleAsync(context).GetAwaiter().GetResult();

            return context.HasSucceeded;
        }

        [Test]
        public void should_not_trust_spoofed_loopback_from_a_public_peer()
        {
            var httpContext = Send("198.51.100.7", "127.0.0.1");

            httpContext.Connection.RemoteIpAddress.Should().Be(IPAddress.Parse("198.51.100.7"));
            IsAuthorized(httpContext).Should().BeFalse();
        }

        [TestCase(CloudflaredPeer)]
        [TestCase("172.17.0.5")]
        [TestCase("::ffff:192.168.0.20")]
        public void should_treat_tunnel_request_from_the_internet_as_remote(string peer)
        {
            var httpContext = Send(peer, InternetClient, CloudflareHeaders(InternetClient));

            httpContext.Connection.RemoteIpAddress.Should().Be(IPAddress.Parse(InternetClient));
            IsAuthorized(httpContext).Should().BeFalse();
        }

        [Test]
        public void should_treat_tunnel_request_with_spoofed_forwarded_for_as_remote()
        {
            // Cloudflare appends the real client after whatever the client sent
            var httpContext = Send(CloudflaredPeer, $"127.0.0.1, {InternetClient}", CloudflareHeaders(InternetClient));

            IsAuthorized(httpContext).Should().BeFalse();
        }

        [Test]
        public void should_treat_tunnel_request_without_visitor_ip_headers_as_remote()
        {
            var httpContext = Send(CloudflaredPeer, null, ("CF-Ray", "8c1a2b3c4d5e6f70-LHR"), ("CDN-Loop", "cloudflare"));

            IsAuthorized(httpContext).Should().BeFalse();
        }

        [Test]
        public void should_resolve_the_whole_chain_of_private_proxies()
        {
            // tunnel connector in Docker, then a reverse proxy on the LAN appending its address
            var httpContext = Send("192.168.0.2", $"{InternetClient}, 172.17.0.5");

            httpContext.Connection.RemoteIpAddress.Should().Be(IPAddress.Parse(InternetClient));
            IsAuthorized(httpContext).Should().BeFalse();
        }

        [Test]
        public void should_treat_malformed_forwarded_for_as_remote()
        {
            IsAuthorized(Send("192.168.0.2", "not-an-address")).Should().BeFalse();
        }

        [Test]
        public void should_bypass_for_lan_client_without_proxy()
        {
            IsAuthorized(Send("192.168.0.50", null)).Should().BeTrue();
        }

        [Test]
        public void should_bypass_for_lan_client_behind_lan_proxy()
        {
            var httpContext = Send("192.168.0.2", "192.168.0.50");

            httpContext.Connection.RemoteIpAddress.Should().Be(IPAddress.Parse("192.168.0.50"));
            IsAuthorized(httpContext).Should().BeTrue();
        }

        [TestCase("")]
        [TestCase("172.17.0.1")]
        public void should_not_trust_a_lan_proxy_outside_trusted_networks(string trustedNetworks)
        {
            var httpContext = SendWithTrustedNetworks(trustedNetworks, "192.168.0.190:8787", "192.168.0.2", InternetClient);

            // The client address stays the proxy's, and the unresolved header keeps it from counting as local
            httpContext.Connection.RemoteIpAddress.Should().Be(IPAddress.Parse("192.168.0.2"));
            IsAuthorized(httpContext).Should().BeFalse();
        }

        [Test]
        public void should_not_trust_spoofed_forwarded_for_from_a_lan_peer_outside_trusted_networks()
        {
            var httpContext = SendWithTrustedNetworks(string.Empty, "192.168.0.190:8787", "192.168.0.66", "10.9.8.7");

            httpContext.Connection.RemoteIpAddress.Should().Be(IPAddress.Parse("192.168.0.66"));
        }

        [Test]
        public void should_trust_a_proxy_listed_in_trusted_networks()
        {
            var httpContext = SendWithTrustedNetworks("172.17.0.1", "192.168.0.190:8787", "172.17.0.1", InternetClient);

            httpContext.Connection.RemoteIpAddress.Should().Be(IPAddress.Parse(InternetClient));
            IsAuthorized(httpContext).Should().BeFalse();
        }

        [Test]
        public void should_always_trust_a_proxy_on_this_machine()
        {
            var httpContext = SendWithTrustedNetworks(string.Empty, "192.168.0.190:8787", "127.0.0.1", InternetClient);

            httpContext.Connection.RemoteIpAddress.Should().Be(IPAddress.Parse(InternetClient));
        }

        private void GivenAllowedHosts(params string[] allowedHosts)
        {
            Mocker.GetMock<IOptionsMonitor<HostFilteringOptions>>()
                  .SetupGet(o => o.CurrentValue)
                  .Returns(new HostFilteringOptions { AllowedHosts = allowedHosts });
        }

        [Test]
        public void should_not_bypass_for_a_public_host_name_without_allowed_hosts()
        {
            IsAuthorized(SendWithTrustedNetworks(string.Empty, "readarr.example.com", "192.168.0.50", null)).Should().BeFalse();
        }

        [Test]
        public void should_not_bypass_for_a_public_host_name_when_allowed_hosts_is_a_wildcard()
        {
            GivenAllowedHosts("*");

            IsAuthorized(SendWithTrustedNetworks(string.Empty, "readarr.example.com", "192.168.0.50", null)).Should().BeFalse();
        }

        [Test]
        public void should_bypass_for_an_allowed_host_name_once_hosts_are_filtered()
        {
            // Host filtering has already turned away every other host by the time this runs
            GivenAllowedHosts("readarr.example.com", "localhost");

            IsAuthorized(SendWithTrustedNetworks(string.Empty, "readarr.example.com", "192.168.0.50", null)).Should().BeTrue();
        }

        // DNS rebinding: a page on evil.example.com, opened in a browser inside Trusted Networks, now resolves to
        // Readarr. The browser sends Host: evil.example.com, but script can add any X-Forwarded-* header it likes.
        [Test]
        public void should_not_bypass_for_a_rebound_page_forwarding_a_local_host()
        {
            var httpContext = SendWithTrustedNetworks(ConfigFileProvider.LegacyTrustedNetworks, "evil.example.com:8787", "192.168.0.50", "127.0.0.1", ("X-Forwarded-Host", "localhost"));

            httpContext.Request.Host.Host.Should().Be("localhost");
            IsAuthorized(httpContext).Should().BeFalse();
        }

        [Test]
        public void should_not_bypass_for_a_rebound_page_forwarding_an_allowed_host()
        {
            GivenAllowedHosts("readarr.example.com");

            var httpContext = SendWithTrustedNetworks(ConfigFileProvider.LegacyTrustedNetworks, "evil.example.com:8787", "192.168.0.50", "127.0.0.1", ("X-Forwarded-Host", "readarr.example.com"));

            IsAuthorized(httpContext).Should().BeFalse();
        }

        [Test]
        public void should_bypass_for_lan_client_behind_lan_proxy_forwarding_an_allowed_host()
        {
            GivenAllowedHosts("readarr.example.com");

            var httpContext = SendWithTrustedNetworks(ConfigFileProvider.LegacyTrustedNetworks, "readarr.example.com", "192.168.0.2", "192.168.0.50", ("X-Forwarded-Host", "readarr.example.com"));

            IsAuthorized(httpContext).Should().BeTrue();
        }

        [TestCase("evil.example.com", 400)]
        [TestCase("readarr.example.com", 200)]
        [TestCase("localhost", 200)]
        public async Task host_filtering_should_turn_away_hosts_not_allowed(string host, int expectedStatus)
        {
            var configFileProvider = new Mock<IConfigFileProvider>();
            configFileProvider.SetupGet(c => c.AllowedHosts).Returns("readarr.example.com");

            var options = new HostFilteringOptions();
            new ConfigureHostFilteringOptions(configFileProvider.Object, NLog.LogManager.CreateNullLogger()).Configure(options);

            var monitor = new Mock<IOptionsMonitor<HostFilteringOptions>>();
            monitor.SetupGet(o => o.CurrentValue).Returns(options);

            var middleware = new HostFilteringMiddleware(_ => Task.CompletedTask, NullLogger<HostFilteringMiddleware>.Instance, monitor.Object);

            var httpContext = new DefaultHttpContext();
            httpContext.Request.Host = new HostString(host);

            await middleware.Invoke(httpContext);

            httpContext.Response.StatusCode.Should().Be(expectedStatus);
        }
    }
}
