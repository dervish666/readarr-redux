using System;
using System.Net;
using System.Net.Http;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Http;
using NzbDrone.Core.Http;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.Http
{
    [TestFixture]
    public class CachedHttpResponseServiceFixture : CoreTest<CachedHttpResponseService>
    {
        private const string Url = "https://api.example.org/author/1";

        private void GivenExpiredCacheEntry()
        {
            Mocker.GetMock<ICachedHttpResponseRepository>()
                .Setup(s => s.FindByUrl(Url))
                .Returns(new CachedHttpResponse
                {
                    Url = Url,
                    Value = "{\"id\":\"stale\"}",
                    StatusCode = 200,
                    LastRefresh = DateTime.UtcNow.AddDays(-2),
                    Expiry = DateTime.UtcNow.AddDays(-1)
                });
        }

        private void GivenLiveResponse(HttpStatusCode statusCode)
        {
            Mocker.GetMock<IHttpClient>()
                .Setup(s => s.Get(It.IsAny<HttpRequest>()))
                .Returns<HttpRequest>(r => new HttpResponse(r, new HttpHeader(), "upstream error", statusCode));
        }

        private static HttpRequest SuppressedRequest()
        {
            return new HttpRequest(Url) { SuppressHttpError = true };
        }

        [Test]
        public void should_return_response_even_if_caching_it_fails()
        {
            var request = new HttpRequest(Url);

            Mocker.GetMock<IHttpClient>()
                .Setup(s => s.Get(It.IsAny<HttpRequest>()))
                .Returns<HttpRequest>(r => new HttpResponse(r, new HttpHeader(), "{\"id\":1}"));

            Mocker.GetMock<ICachedHttpResponseRepository>()
                .Setup(s => s.Upsert(It.IsAny<CachedHttpResponse>()))
                .Throws(new InvalidOperationException("database is locked"));

            var response = Subject.Get(request, true, TimeSpan.FromHours(1));

            response.Content.Should().Be("{\"id\":1}");
            ExceptionVerification.ExpectedWarns(1);
        }

        [TestCase(HttpStatusCode.Unauthorized)]
        [TestCase(HttpStatusCode.InternalServerError)]
        [TestCase(HttpStatusCode.BadGateway)]
        [TestCase(HttpStatusCode.ServiceUnavailable)]
        [TestCase(HttpStatusCode.GatewayTimeout)]
        public void should_return_expired_entry_when_live_response_is_an_upstream_error(HttpStatusCode statusCode)
        {
            GivenExpiredCacheEntry();
            GivenLiveResponse(statusCode);

            var response = Subject.Get(SuppressedRequest(), true, TimeSpan.FromHours(1));

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            response.Content.Should().Be("{\"id\":\"stale\"}");
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_return_expired_entry_when_live_call_throws_for_upstream_error()
        {
            GivenExpiredCacheEntry();

            Mocker.GetMock<IHttpClient>()
                .Setup(s => s.Get(It.IsAny<HttpRequest>()))
                .Returns<HttpRequest>(r => throw new HttpException(r, new HttpResponse(r, new HttpHeader(), "Unauthorized", HttpStatusCode.Unauthorized)));

            var response = Subject.Get(new HttpRequest(Url), true, TimeSpan.FromHours(1));

            response.Content.Should().Be("{\"id\":\"stale\"}");
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_return_expired_entry_when_live_call_times_out()
        {
            GivenExpiredCacheEntry();

            Mocker.GetMock<IHttpClient>()
                .Setup(s => s.Get(It.IsAny<HttpRequest>()))
                .Throws(new WebException("Http request timed out", WebExceptionStatus.Timeout));

            var response = Subject.Get(SuppressedRequest(), false, TimeSpan.FromHours(1));

            response.Content.Should().Be("{\"id\":\"stale\"}");
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_return_expired_entry_when_metadata_source_is_unreachable()
        {
            GivenExpiredCacheEntry();

            // What the dispatcher throws for a refused connection, an unknown host or no route to it
            Mocker.GetMock<IHttpClient>()
                .Setup(s => s.Get(It.IsAny<HttpRequest>()))
                .Throws(new HttpRequestException("No route to host (192.168.0.190:8790)"));

            var response = Subject.Get(SuppressedRequest(), true, TimeSpan.FromHours(1));

            response.Content.Should().Be("{\"id\":\"stale\"}");
            ExceptionVerification.ExpectedWarns(1);
        }

        [TestCase(HttpStatusCode.NotFound)]
        [TestCase(HttpStatusCode.TooManyRequests)]
        public void should_not_return_expired_entry_for_answers_that_are_not_outages(HttpStatusCode statusCode)
        {
            GivenExpiredCacheEntry();
            GivenLiveResponse(statusCode);

            var response = Subject.Get(SuppressedRequest(), true, TimeSpan.FromHours(1));

            response.StatusCode.Should().Be(statusCode);
        }

        [Test]
        public void should_rethrow_timeout_when_nothing_is_cached()
        {
            Mocker.GetMock<IHttpClient>()
                .Setup(s => s.Get(It.IsAny<HttpRequest>()))
                .Throws(new WebException("Http request timed out", WebExceptionStatus.Timeout));

            Assert.Throws<WebException>(() => Subject.Get(SuppressedRequest(), true, TimeSpan.FromHours(1)));
        }
    }
}
