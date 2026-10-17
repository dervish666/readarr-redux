using System.IO;
using System.Net;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using NUnit.Framework;
using NzbDrone.Core.Authentication;
using NzbDrone.Core.Configuration;
using NzbDrone.Test.Common;
using Readarr.Http.Authentication;

namespace NzbDrone.Api.Test.Authentication
{
    [TestFixture]
    public class UnconfiguredAuthenticationHandlerFixture : TestBase
    {
        private static HttpContext GetHttpContext(string remoteIp)
        {
            var httpContext = new DefaultHttpContext();
            httpContext.Connection.RemoteIpAddress = IPAddress.Parse(remoteIp);
            httpContext.Response.Body = new MemoryStream();

            return httpContext;
        }

        private async Task<UnconfiguredAuthenticationHandler> GetHandler(HttpContext httpContext)
        {
            var options = new Mock<IOptionsMonitor<AuthenticationSchemeOptions>>();
            options.Setup(o => o.Get(It.IsAny<string>())).Returns(new AuthenticationSchemeOptions());

            var handler = new UnconfiguredAuthenticationHandler(options.Object, NullLoggerFactory.Instance, UrlEncoder.Default, Mocker.GetMock<IConfigFileProvider>().Object);
            await handler.InitializeAsync(new AuthenticationScheme(AuthenticationType.None.ToString(), null, typeof(UnconfiguredAuthenticationHandler)), httpContext);

            return handler;
        }

        [Test]
        public async Task authentication_method_none_should_use_this_handler()
        {
            var services = new ServiceCollection();
            services.AddAppAuthentication();

            var schemes = services.BuildServiceProvider().GetRequiredService<IAuthenticationSchemeProvider>();

            (await schemes.GetSchemeAsync(AuthenticationType.None.ToString())).HandlerType.Should().Be(typeof(UnconfiguredAuthenticationHandler));
            (await schemes.GetSchemeAsync(AuthenticationType.External.ToString())).HandlerType.Should().Be(typeof(NoAuthenticationHandler));
        }

        [TestCase("127.0.0.1")]
        [TestCase("192.168.0.20")]
        public async Task should_let_the_local_network_in_to_set_up_a_login(string address)
        {
            var handler = await GetHandler(GetHttpContext(address));

            var result = await handler.AuthenticateAsync();

            result.Succeeded.Should().BeTrue();
        }

        [Test]
        public async Task should_refuse_a_public_address()
        {
            var handler = await GetHandler(GetHttpContext("203.0.113.66"));

            var result = await handler.AuthenticateAsync();

            result.Succeeded.Should().BeFalse();
            result.None.Should().BeTrue();
            ExceptionVerification.IgnoreWarns();
        }

        [Test]
        public async Task should_refuse_a_request_that_came_through_cloudflare()
        {
            var httpContext = GetHttpContext("192.168.0.20");
            httpContext.Request.Headers["CF-Connecting-IP"] = "203.0.113.9";

            var handler = await GetHandler(httpContext);

            var result = await handler.AuthenticateAsync();

            result.Succeeded.Should().BeFalse();
            ExceptionVerification.IgnoreWarns();
        }

        [Test]
        public async Task should_say_why_when_refusing()
        {
            var httpContext = GetHttpContext("203.0.113.66");
            var handler = await GetHandler(httpContext);

            await handler.ChallengeAsync(new AuthenticationProperties());

            httpContext.Response.StatusCode.Should().Be(401);
            httpContext.Response.Body.Position = 0;
            new StreamReader(httpContext.Response.Body).ReadToEnd().Should().Be(UnconfiguredAuthenticationHandler.RefusedMessage);
        }
    }
}
