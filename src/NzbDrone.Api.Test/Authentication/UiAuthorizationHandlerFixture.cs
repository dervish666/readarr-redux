using System.Net;
using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using NUnit.Framework;
using NzbDrone.Core.Authentication;
using NzbDrone.Core.Configuration;
using NzbDrone.Http.Authentication;
using NzbDrone.Test.Common;

namespace NzbDrone.Api.Test.Authentication
{
    [TestFixture]
    public class UiAuthorizationHandlerFixture : TestBase<UiAuthorizationHandler>
    {
        [SetUp]
        public void Setup()
        {
            Mocker.GetMock<IConfigFileProvider>()
                  .SetupGet(c => c.AuthenticationRequired)
                  .Returns(AuthenticationRequiredType.DisabledForLocalAddresses);
        }

        private static HttpContext GetHttpContext(string remoteIp, string unconsumedForwardedFor = null)
        {
            var httpContext = new DefaultHttpContext();

            httpContext.Connection.RemoteIpAddress = remoteIp == null ? null : IPAddress.Parse(remoteIp);
            httpContext.Request.Host = new HostString("127.0.0.1");

            if (unconsumedForwardedFor != null)
            {
                httpContext.Request.Headers[ForwardedHeadersDefaults.XForwardedForHeaderName] = unconsumedForwardedFor;
            }

            return httpContext;
        }

        private bool IsAuthorized(HttpContext httpContext)
        {
            var requirement = new BypassableDenyAnonymousAuthorizationRequirement();
            var context = new AuthorizationHandlerContext(new[] { requirement }, new ClaimsPrincipal(), httpContext);

            Subject.HandleAsync(context).GetAwaiter().GetResult();

            return context.HasSucceeded;
        }

        [TestCase("127.0.0.1")]
        [TestCase("192.168.1.50")]
        [TestCase("10.0.0.5")]
        [TestCase("::ffff:192.168.1.50")]
        public void should_bypass_authentication_for_local_address_without_forwarded_headers(string address)
        {
            IsAuthorized(GetHttpContext(address)).Should().BeTrue();
        }

        [TestCase("192.168.0.190", true)]
        [TestCase("[::1]", true)]
        [TestCase("localhost", true)]
        [TestCase("tower", true)]
        [TestCase("tower.local", true)]
        [TestCase("nas.lan", true)]
        [TestCase("box.home.arpa", true)]
        [TestCase("x.internal", true)]
        [TestCase("BOX.HOME.ARPA.", true)]
        [TestCase("tower.localhost", false)]
        [TestCase("evil.example.com", false)]
        [TestCase("readarr.mydomain.co.uk", false)]
        [TestCase("", false)]
        public void should_only_bypass_authentication_for_local_host_names(string host, bool expected)
        {
            var httpContext = GetHttpContext("192.168.1.50");
            httpContext.Request.Host = new HostString(host);

            IsAuthorized(httpContext).Should().Be(expected);
        }

        [Test]
        public void should_not_bypass_authentication_for_public_address_without_forwarded_headers()
        {
            IsAuthorized(GetHttpContext("203.0.113.66")).Should().BeFalse();
        }

        [TestCase("127.0.0.1")]
        [TestCase("192.168.1.50")]
        [TestCase("10.0.0.5")]
        public void should_not_bypass_authentication_for_forwarded_headers_from_an_untrusted_peer(string forwardedFor)
        {
            IsAuthorized(GetHttpContext("10.0.0.99", forwardedFor)).Should().BeFalse();
        }

        [Test]
        public void should_not_bypass_authentication_for_a_truncated_proxy_chain()
        {
            IsAuthorized(GetHttpContext("10.0.0.2", "203.0.113.9")).Should().BeFalse();
        }

        [TestCase("Forwarded", "for=192.168.1.50")]
        [TestCase("CF-Connecting-IP", "203.0.113.9")]
        [TestCase("CF-Ray", "8c1a2b3c4d5e6f70-LHR")]
        [TestCase("CDN-Loop", "cloudflare")]
        public void should_not_bypass_authentication_for_request_that_came_through_an_unresolved_proxy(string header, string value)
        {
            var httpContext = GetHttpContext("192.168.1.20");
            httpContext.Request.Headers[header] = value;

            IsAuthorized(httpContext).Should().BeFalse();
        }

        [Test]
        public void should_not_bypass_authentication_without_a_client_address()
        {
            IsAuthorized(GetHttpContext(null)).Should().BeFalse();
        }

        [Test]
        public void should_not_bypass_authentication_when_authentication_is_required()
        {
            Mocker.GetMock<IConfigFileProvider>()
                  .SetupGet(c => c.AuthenticationRequired)
                  .Returns(AuthenticationRequiredType.Enabled);

            IsAuthorized(GetHttpContext("127.0.0.1")).Should().BeFalse();
        }
    }
}
