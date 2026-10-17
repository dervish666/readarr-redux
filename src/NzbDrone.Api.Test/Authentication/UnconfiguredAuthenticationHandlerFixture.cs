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

            var handler = new UnconfiguredAuthenticationHandler(options.Object, NullLoggerFactory.Instance, UrlEncoder.Default, Mocker.GetMock<IConfigFileProvider>().Object, Mocker.GetMock<ISetupCodeService>().Object);
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
            var body = new StreamReader(httpContext.Response.Body).ReadToEnd();
            body.Should().Be(UnconfiguredAuthenticationHandler.RefusedMessage);

            // A remote user needs a way back in, not only the reason
            body.Should().Contain("SSH tunnel").And.Contain("username and password").And.Contain("External");
        }

        private void GivenSetupCodeRequired()
        {
            Mocker.GetMock<ISetupCodeService>().SetupGet(s => s.IsRequired).Returns(true);
            Mocker.GetMock<ISetupCodeService>().Setup(s => s.IsValidProof("good")).Returns(true);
        }

        // A reverse proxy on the same machine that sends no X-Forwarded-For looks exactly like this
        [TestCase("127.0.0.1")]
        [TestCase("192.168.0.20")]
        public async Task should_ask_a_local_request_for_the_setup_code_until_it_has_been_entered(string address)
        {
            GivenSetupCodeRequired();

            var handler = await GetHandler(GetHttpContext(address));

            var result = await handler.AuthenticateAsync();

            result.Succeeded.Should().BeFalse();
        }

        [Test]
        public async Task should_let_in_a_local_browser_that_entered_the_setup_code()
        {
            GivenSetupCodeRequired();

            var httpContext = GetHttpContext("127.0.0.1");
            httpContext.Request.Headers.Cookie = $"{UnconfiguredAuthenticationHandler.SetupCookieName}=good";

            var handler = await GetHandler(httpContext);

            var result = await handler.AuthenticateAsync();

            result.Succeeded.Should().BeTrue();
        }

        [Test]
        public async Task should_refuse_a_public_address_even_with_the_setup_code()
        {
            GivenSetupCodeRequired();

            var httpContext = GetHttpContext("203.0.113.66");
            httpContext.Request.Headers.Cookie = $"{UnconfiguredAuthenticationHandler.SetupCookieName}=good";

            var handler = await GetHandler(httpContext);

            var result = await handler.AuthenticateAsync();

            result.Succeeded.Should().BeFalse();
            ExceptionVerification.IgnoreWarns();
        }

        [Test]
        public async Task should_refuse_a_wrong_setup_cookie()
        {
            GivenSetupCodeRequired();

            var httpContext = GetHttpContext("127.0.0.1");
            httpContext.Request.Headers.Cookie = $"{UnconfiguredAuthenticationHandler.SetupCookieName}=bad";

            var handler = await GetHandler(httpContext);

            (await handler.AuthenticateAsync()).Succeeded.Should().BeFalse();
        }

        [Test]
        public async Task should_show_a_browser_the_setup_code_form()
        {
            GivenSetupCodeRequired();

            var httpContext = GetHttpContext("127.0.0.1");
            httpContext.Request.Method = "GET";
            httpContext.Request.Headers.Accept = "text/html,application/xhtml+xml";

            var handler = await GetHandler(httpContext);
            await handler.AuthenticateAsync();
            await handler.ChallengeAsync(new AuthenticationProperties());

            httpContext.Response.StatusCode.Should().Be(401);
            httpContext.Response.ContentType.Should().StartWith("text/html");
            httpContext.Response.Body.Position = 0;
            new StreamReader(httpContext.Response.Body).ReadToEnd().Should().Contain("action=\"/setup/code\"").And.Contain("name=\"code\"");
        }

        [Test]
        public async Task should_tell_an_api_call_to_enter_the_setup_code()
        {
            GivenSetupCodeRequired();

            var httpContext = GetHttpContext("127.0.0.1");
            httpContext.Request.Headers.XRequestedWith = "XMLHttpRequest";

            var handler = await GetHandler(httpContext);
            await handler.AuthenticateAsync();
            await handler.ChallengeAsync(new AuthenticationProperties());

            httpContext.Response.StatusCode.Should().Be(401);
            httpContext.Response.Body.Position = 0;
            new StreamReader(httpContext.Response.Body).ReadToEnd().Should().Be(UnconfiguredAuthenticationHandler.SetupCodeMessage);
        }

        [Test]
        public void should_put_the_url_base_in_the_form_and_say_when_the_code_was_wrong()
        {
            var page = UnconfiguredAuthenticationHandler.SetupCodePage("/readarr", true);

            page.Should().Contain("action=\"/readarr/setup/code\"").And.Contain("isn't right");
        }
    }
}
