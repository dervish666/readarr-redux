using System;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Cache;
using NzbDrone.Common.Http;
using NzbDrone.Common.Http.Dispatchers;
using NzbDrone.Common.Http.Proxy;
using NzbDrone.Test.Common;
using HttpClient = System.Net.Http.HttpClient;

namespace NzbDrone.Common.Test.Http
{
    [TestFixture]
    public class ManagedHttpDispatcherFixture : TestBase
    {
        private class CapturingHandler : HttpMessageHandler
        {
            public HttpRequestMessage LastRequest { get; private set; }

            protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            {
                LastRequest = request;

                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(Array.Empty<byte>()) });
            }
        }

        private class StubDispatcher : ManagedHttpDispatcher
        {
            private readonly HttpMessageHandler _handler;

            public StubDispatcher(HttpMessageHandler handler, IUserAgentBuilder userAgentBuilder)
                : base(Mock.Of<IHttpProxySettingsProvider>(), Mock.Of<ICreateManagedWebProxy>(), Mock.Of<ICertificateValidationService>(), userAgentBuilder, new CacheManager(), TestLogger)
            {
                _handler = handler;
            }

            protected override HttpClient GetClient(HttpUri uri, bool publicAddressesOnly)
            {
                return new HttpClient(_handler, false);
            }

            public SocketsHttpHandler CreateRealHandler()
            {
                return CreateHandler(null);
            }
        }

        private static IUserAgentBuilder UserAgent()
        {
            var userAgent = new Mock<IUserAgentBuilder>();
            userAgent.Setup(s => s.GetUserAgent(It.IsAny<bool>())).Returns("Readarr/1.0");

            return userAgent.Object;
        }

        [Test]
        public void should_send_basic_auth_header_as_utf8()
        {
            var username = "tèst";
            var password = "pâsswörd_ș";

            var handler = new CapturingHandler();
            var dispatcher = new StubDispatcher(handler, UserAgent());
            var request = new HttpRequest("http://downloadclient.local/api")
            {
                Credentials = new BasicNetworkCredential(username, password)
            };

            dispatcher.GetResponseAsync(request, new CookieContainer()).GetAwaiter().GetResult();

            var authorization = handler.LastRequest.Headers.Authorization;
            authorization.Scheme.Should().Be("Basic");

            var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(authorization.Parameter));
            decoded.Should().Be($"{username}:{password}");
        }

        [Test]
        public void should_recycle_pooled_connections()
        {
            var dispatcher = new StubDispatcher(new CapturingHandler(), UserAgent());

            using var handler = dispatcher.CreateRealHandler();

            handler.PooledConnectionLifetime.Should().Be(TimeSpan.FromMinutes(30));
        }
    }
}
