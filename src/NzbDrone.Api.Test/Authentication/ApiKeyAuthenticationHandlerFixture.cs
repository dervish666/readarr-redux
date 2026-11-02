using System.Text.Encodings.Web;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using NUnit.Framework;
using NzbDrone.Core.Configuration;
using NzbDrone.Test.Common;
using Readarr.Http.Authentication;

namespace NzbDrone.Api.Test.Authentication
{
    [TestFixture]
    public class ApiKeyAuthenticationHandlerFixture : TestBase
    {
        private const string ApiKey = "0123456789abcdef0123456789abcdef";

        private async Task<AuthenticateResult> Authenticate(string configuredKey, string providedKey)
        {
            var options = new Mock<IOptionsMonitor<ApiKeyAuthenticationOptions>>();
            options.Setup(o => o.Get(It.IsAny<string>())).Returns(new ApiKeyAuthenticationOptions { HeaderName = "X-Api-Key", QueryName = "apikey" });

            Mocker.GetMock<IConfigFileProvider>().SetupGet(c => c.ApiKey).Returns(configuredKey);

            var httpContext = new DefaultHttpContext();
            httpContext.Request.Headers["X-Api-Key"] = providedKey;

            var handler = new ApiKeyAuthenticationHandler(options.Object, NullLoggerFactory.Instance, UrlEncoder.Default, Mocker.GetMock<IConfigFileProvider>().Object);
            await handler.InitializeAsync(new AuthenticationScheme("API", null, typeof(ApiKeyAuthenticationHandler)), httpContext);

            return await handler.AuthenticateAsync();
        }

        [Test]
        public async Task should_accept_the_configured_key()
        {
            (await Authenticate(ApiKey, ApiKey)).Succeeded.Should().BeTrue();
        }

        [TestCase("0123456789abcdef0123456789abcdee")]
        [TestCase("0123456789abcdef")]
        [TestCase("0123456789abcdef0123456789abcdef0")]
        [TestCase("0123456789ABCDEF0123456789ABCDEF")]
        public async Task should_refuse_a_different_key(string providedKey)
        {
            (await Authenticate(ApiKey, providedKey)).Succeeded.Should().BeFalse();
        }

        [TestCase(null)]
        [TestCase("")]
        public async Task should_refuse_any_key_when_none_is_configured(string configuredKey)
        {
            (await Authenticate(configuredKey, "anything")).Succeeded.Should().BeFalse();
        }
    }
}
