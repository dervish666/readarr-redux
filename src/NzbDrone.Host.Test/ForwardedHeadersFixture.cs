using System.Net;
using System.Security.Claims;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
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
            var options = new ForwardedHeadersOptions();
            ForwardedHeadersConfigurator.Configure(options);

            var middleware = new ForwardedHeadersMiddleware(_ => Task.CompletedTask, NullLoggerFactory.Instance, Options.Create(options));

            var httpContext = new DefaultHttpContext();
            httpContext.Connection.RemoteIpAddress = IPAddress.Parse(peer);
            httpContext.Request.Host = new HostString("192.168.0.190:8787");

            if (forwardedFor != null)
            {
                httpContext.Request.Headers[ForwardedHeadersDefaults.XForwardedForHeaderName] = forwardedFor;
            }

            foreach (var (name, value) in headers)
            {
                httpContext.Request.Headers[name] = value;
            }

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
    }
}
