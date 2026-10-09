using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Http;
using NzbDrone.Core.Http;
using NzbDrone.Core.MetadataSource;
using NzbDrone.Core.MetadataSource.BookInfo;
using NzbDrone.Core.MetadataSource.Goodreads;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.MetadataSource.Goodreads
{
    [TestFixture]
    public class BookInfoProxyRetryFixture : CoreTest<BookInfoProxy>
    {
        private const string WorkResponse = "{\"ForeignId\":1,\"Title\":\"Work\",\"Books\":[{\"ForeignId\":11,\"Title\":\"Work\",\"RatingCount\":1,\"AverageRating\":4.0," +
                                            "\"Contributors\":[{\"ForeignId\":5,\"Role\":\"Author\"}]}],\"Series\":[],\"Authors\":[{\"ForeignId\":5,\"Name\":\"Author Five\"}]}";

        private List<TimeSpan> _sleeps;

        [SetUp]
        public void Setup()
        {
            Mocker.GetMock<IMetadataRequestBuilder>()
                .Setup(s => s.GetRequestBuilder())
                .Returns(new HttpRequestBuilder("http://metadata.test/{route}").CreateFactory());

            _sleeps = new List<TimeSpan>();
            Subject.Sleep = t => _sleeps.Add(t);
        }

        private static HttpResponse Respond(HttpRequest request, HttpStatusCode statusCode, string retryAfter = null)
        {
            var headers = new HttpHeader();

            if (retryAfter != null)
            {
                headers.Add("Retry-After", retryAfter);
            }

            return new HttpResponse(request, headers, statusCode == HttpStatusCode.OK ? WorkResponse : "error", statusCode);
        }

        private void GivenResponses(params Func<HttpRequest, HttpResponse>[] responses)
        {
            var queue = new Queue<Func<HttpRequest, HttpResponse>>(responses);

            Mocker.GetMock<IHttpClient>()
                .Setup(s => s.Get(It.IsAny<HttpRequest>()))
                .Returns<HttpRequest>(r => queue.Dequeue()(r));
        }

        private void GivenWorkResponses(params HttpStatusCode[] statusCodes)
        {
            GivenResponses(statusCodes.Select(c => (Func<HttpRequest, HttpResponse>)(r => Respond(r, c))).ToArray());
        }

        [Test]
        public void should_give_up_after_five_tries_when_rate_limited()
        {
            Mocker.GetMock<IHttpClient>()
                .Setup(s => s.Get(It.IsAny<HttpRequest>()))
                .Returns<HttpRequest>(r => Respond(r, HttpStatusCode.TooManyRequests, "30"));

            Assert.Throws<BookInfoException>(() => Subject.GetBookInfo("1"));

            Mocker.GetMock<IHttpClient>().Verify(s => s.Get(It.IsAny<HttpRequest>()), Times.Exactly(5));
            _sleeps.Should().Equal(Enumerable.Repeat(TimeSpan.FromSeconds(30), 4));
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_give_up_when_retry_after_is_over_sixty_seconds()
        {
            GivenResponses(r => Respond(r, HttpStatusCode.TooManyRequests, "600"), r => Respond(r, HttpStatusCode.OK));

            Assert.Throws<BookInfoException>(() => Subject.GetBookInfo("1"));

            _sleeps.Should().BeEmpty();
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_stop_retrying_once_the_command_budget_is_spent()
        {
            Mocker.GetMock<IHttpClient>()
                .Setup(s => s.Get(It.IsAny<HttpRequest>()))
                .Returns<HttpRequest>(r => Respond(r, HttpStatusCode.TooManyRequests, "30"));

            using (MetadataRetryBudget.Start(TimeSpan.FromSeconds(70)))
            {
                Assert.Throws<BookInfoException>(() => Subject.GetBookInfo("1"));

                MetadataRetryBudget.Exhausted.Should().BeTrue();
            }

            MetadataRetryBudget.Exhausted.Should().BeFalse();
            _sleeps.Should().Equal(TimeSpan.FromSeconds(30), TimeSpan.FromSeconds(30));
            Mocker.GetMock<IHttpClient>().Verify(s => s.Get(It.IsAny<HttpRequest>()), Times.Exactly(3));
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_give_up_on_rate_limited_author_after_five_tries()
        {
            Mocker.GetMock<ICachedHttpResponseService>()
                .Setup(s => s.Get(It.IsAny<HttpRequest>(), It.IsAny<bool>(), It.IsAny<TimeSpan>()))
                .Returns((HttpRequest request, bool useCache, TimeSpan ttl) => Respond(request, HttpStatusCode.TooManyRequests, "0"));

            Assert.Throws<BookInfoException>(() => Subject.GetAuthorInfo("5", false));

            Mocker.GetMock<ICachedHttpResponseService>().Verify(s => s.Get(It.IsAny<HttpRequest>(), It.IsAny<bool>(), It.IsAny<TimeSpan>()), Times.Exactly(5));
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_stop_retrying_rate_limited_edition_lookup()
        {
            var calls = 0;

            // Without a cap this lookup loops forever, so fail loudly instead of hanging
            Mocker.GetMock<IHttpClient>()
                .Setup(s => s.Get(It.IsAny<HttpRequest>()))
                .Returns<HttpRequest>(r => ++calls > 10 ? throw new InvalidOperationException("uncapped 429 loop") : Respond(r, HttpStatusCode.TooManyRequests, "0"));

            Assert.Throws<BookInfoException>(() => Subject.SearchByGoodreadsBookId(11, false));

            calls.Should().Be(5);
        }

        [TestCase(HttpStatusCode.BadGateway)]
        [TestCase(HttpStatusCode.ServiceUnavailable)]
        [TestCase(HttpStatusCode.GatewayTimeout)]
        public void should_retry_gateway_errors_twice(HttpStatusCode statusCode)
        {
            GivenWorkResponses(statusCode, statusCode, HttpStatusCode.OK);

            Subject.GetBookInfo("1").Item2.ForeignBookId.Should().Be("1");

            _sleeps.Should().HaveCount(2);
            _sleeps[0].Should().BeGreaterOrEqualTo(TimeSpan.FromSeconds(1)).And.BeLessThan(TimeSpan.FromSeconds(2));
            _sleeps[1].Should().BeGreaterOrEqualTo(TimeSpan.FromSeconds(2)).And.BeLessThan(TimeSpan.FromSeconds(4));
        }

        [Test]
        public void should_give_up_after_two_retries_of_gateway_errors()
        {
            GivenWorkResponses(HttpStatusCode.BadGateway, HttpStatusCode.BadGateway, HttpStatusCode.BadGateway, HttpStatusCode.OK);

            Assert.Throws<BookInfoException>(() => Subject.GetBookInfo("1"));

            Mocker.GetMock<IHttpClient>().Verify(s => s.Get(It.IsAny<HttpRequest>()), Times.Exactly(3));
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_not_retry_internal_server_error()
        {
            GivenWorkResponses(HttpStatusCode.InternalServerError, HttpStatusCode.OK);

            Assert.Throws<BookInfoException>(() => Subject.GetBookInfo("1"));

            Mocker.GetMock<IHttpClient>().Verify(s => s.Get(It.IsAny<HttpRequest>()), Times.Once());
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_retry_timeouts_twice()
        {
            GivenResponses(r => throw new WebException("Http request timed out", WebExceptionStatus.Timeout),
                           r => throw new WebException("Http request timed out", WebExceptionStatus.Timeout),
                           r => Respond(r, HttpStatusCode.OK));

            Subject.GetBookInfo("1").Item2.ForeignBookId.Should().Be("1");

            _sleeps.Should().HaveCount(2);
        }

        [Test]
        public void should_retry_a_body_that_stalls_after_the_headers()
        {
            // The dispatcher's timeout cancels the body read, and reports that as a receive failure
            GivenResponses(r => throw new WebException("Failed to read complete http response", new TaskCanceledException(), WebExceptionStatus.ReceiveFailure, null),
                           r => Respond(r, HttpStatusCode.OK));

            Subject.GetBookInfo("1").Item2.ForeignBookId.Should().Be("1");

            _sleeps.Should().HaveCount(1);
        }

        [Test]
        public void should_search_authors_with_one_bulk_request_instead_of_fetching_each_author()
        {
            Mocker.GetMock<IGoodreadsSearchProxy>()
                .Setup(s => s.Search(It.IsAny<string>()))
                .Returns(new List<SearchJsonResource>
                {
                    new SearchJsonResource { BookId = 11, WorkId = 1, Author = new AuthorJsonResource { Id = 5 } },
                    new SearchJsonResource { BookId = 21, WorkId = 2, Author = new AuthorJsonResource { Id = 5 } }
                });

            const string bulk = "{\"Works\":[" +
                                "{\"ForeignId\":1,\"Title\":\"One\",\"Books\":[{\"ForeignId\":11,\"Title\":\"One\",\"Contributors\":[{\"ForeignId\":5}]}],\"Authors\":[{\"ForeignId\":5,\"Name\":\"Author Five\"}]}," +
                                "{\"ForeignId\":2,\"Title\":\"Two\",\"Books\":[{\"ForeignId\":21,\"Title\":\"Two\",\"Contributors\":[{\"ForeignId\":5}]}],\"Authors\":[{\"ForeignId\":5,\"Name\":\"Author Five\"}]}]," +
                                "\"Series\":[],\"Authors\":[{\"ForeignId\":5,\"Name\":\"Author Five\"}]}";

            Mocker.GetMock<IHttpClient>()
                .Setup(s => s.Post(It.Is<HttpRequest>(r => r.Url.FullUri.EndsWith("/book/bulk"))))
                .Returns<HttpRequest>(r => new HttpResponse(r, new HttpHeader(), bulk));

            var authors = Subject.SearchForNewAuthor("author five");

            authors.Should().ContainSingle(a => a.Metadata.Value.Name == "Author Five");
            Mocker.GetMock<ICachedHttpResponseService>()
                .Verify(s => s.Get(It.IsAny<HttpRequest>(), It.IsAny<bool>(), It.IsAny<TimeSpan>()), Times.Never());
        }
    }
}
