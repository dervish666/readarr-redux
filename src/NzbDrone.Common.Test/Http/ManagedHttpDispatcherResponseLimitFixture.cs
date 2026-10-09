using System;
using System.IO;
using System.Net;
using System.Net.Http;
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
    public class ManagedHttpDispatcherResponseLimitFixture : TestBase
    {
        private const int Limit = 2048;

        private class StubHandler : HttpMessageHandler
        {
            private readonly Func<HttpResponseMessage> _respond;

            public StubHandler(Func<HttpResponseMessage> respond)
            {
                _respond = respond;
            }

            protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            {
                return Task.FromResult(_respond());
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

            protected override HttpClient GetClient(HttpUri uri)
            {
                return new HttpClient(_handler, false);
            }
        }

        private HttpResponse Get(HttpStatusCode statusCode, HttpContent content, long? maxResponseLength)
        {
            var userAgent = new Mock<IUserAgentBuilder>();
            userAgent.Setup(s => s.GetUserAgent(It.IsAny<bool>())).Returns("Readarr/1.0");

            var dispatcher = new StubDispatcher(new StubHandler(() => new HttpResponseMessage(statusCode) { Content = content }), userAgent.Object);
            var request = new HttpRequest("http://metadata.local/work/1") { MaxResponseLength = maxResponseLength };

            return dispatcher.GetResponseAsync(request, new CookieContainer()).GetAwaiter().GetResult();
        }

        private static byte[] Bytes(int count)
        {
            var bytes = new byte[count];
            Array.Fill(bytes, (byte)'a');

            return bytes;
        }

        [TestCase(HttpStatusCode.OK)]
        [TestCase(HttpStatusCode.InternalServerError)]
        public void should_read_a_body_within_the_limit(HttpStatusCode statusCode)
        {
            var response = Get(statusCode, new ByteArrayContent(Bytes(Limit)), Limit);

            response.ResponseData.Should().HaveCount(Limit);
        }

        [TestCase(HttpStatusCode.OK)]
        [TestCase(HttpStatusCode.InternalServerError)]
        public void should_refuse_a_body_whose_declared_length_is_over_the_limit(HttpStatusCode statusCode)
        {
            Action act = () => Get(statusCode, new ByteArrayContent(Bytes(Limit + 1)), Limit);

            act.Should().Throw<HttpResponseTooLargeException>();
        }

        [Test]
        public void should_stop_reading_once_the_body_passes_the_limit_whatever_the_header_says()
        {
            // A small Content-Length in front of a large body is what a compressed response looks like after decompression
            var content = new StreamContent(new MemoryStream(Bytes(Limit * 4)));
            content.Headers.ContentLength = 10;

            Action act = () => Get(HttpStatusCode.OK, content, Limit);

            act.Should().Throw<HttpResponseTooLargeException>();
        }

        [Test]
        public void should_not_limit_a_request_without_a_limit()
        {
            var response = Get(HttpStatusCode.OK, new ByteArrayContent(Bytes(Limit * 4)), null);

            response.ResponseData.Should().HaveCount(Limit * 4);
        }
    }
}
