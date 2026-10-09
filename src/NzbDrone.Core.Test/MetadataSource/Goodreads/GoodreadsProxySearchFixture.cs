using System;
using System.Linq;
using System.Net;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Http;
using NzbDrone.Core.Http;
using NzbDrone.Core.MetadataSource;
using NzbDrone.Core.MetadataSource.Goodreads;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.MetadataSource.Goodreads
{
    [TestFixture]
    public class GoodreadsProxySearchFixture : CoreTest<GoodreadsSearchProxy>
    {
        // Recorded from a Goodreads-backed rreading-glasses on 2026-10-09: search results carry IDs only
        private const string SearchResponse = "[{\"bookId\":12070,\"workId\":4110990,\"author\":{\"id\":1221698}},{\"bookId\":34497,\"workId\":194190,\"author\":{\"id\":1654}}]";

        private HttpRequest _request;

        [SetUp]
        public void Setup()
        {
            Mocker.GetMock<IMetadataRequestBuilder>()
                .Setup(s => s.GetRequestBuilder())
                .Returns(new HttpRequestBuilder("http://metadata.test/{route}").CreateFactory());

            Mocker.GetMock<ICachedHttpResponseService>()
                .Setup(x => x.Get(It.IsAny<HttpRequest>(), It.IsAny<bool>(), It.IsAny<TimeSpan>()))
                .Returns((HttpRequest request, bool useCache, TimeSpan ttl) =>
                {
                    _request = request;
                    return new HttpResponse(request, new HttpHeader(), SearchResponse);
                });
        }

        [TestCase("terry pratchett")]
        [TestCase("9780552166591")]
        [TestCase("B0031W1E86")]
        public void should_search_the_configured_metadata_source(string query)
        {
            Subject.Search(query);

            _request.Url.Host.Should().Be("metadata.test");
            _request.Url.Path.Should().Be("/search");
            _request.Url.Query.Should().Be("q=" + Uri.EscapeDataString(query));
        }

        [Test]
        public void should_parse_search_results_that_only_carry_ids()
        {
            var result = Subject.Search("terry pratchett");

            result.Should().HaveCount(2);
            result[0].BookId.Should().Be(12070);
            result[0].WorkId.Should().Be(4110990);
            result[0].Author.Id.Should().Be(1221698);
            result[1].Author.Id.Should().Be(1654);
        }

        [Test]
        public void should_parse_ids_too_big_for_an_int()
        {
            Mocker.GetMock<ICachedHttpResponseService>()
                .Setup(x => x.Get(It.IsAny<HttpRequest>(), It.IsAny<bool>(), It.IsAny<TimeSpan>()))
                .Returns((HttpRequest request, bool useCache, TimeSpan ttl) =>
                    new HttpResponse(request, new HttpHeader(), "[{\"bookId\":3000000002,\"workId\":3000000001,\"author\":{\"id\":3000000000}}]"));

            var result = Subject.Search("big");

            result.Single().BookId.ToString().Should().Be("3000000002");
            result.Single().Author.Id.ToString().Should().Be("3000000000");
        }

        [Test]
        public void should_retry_a_rate_limited_search()
        {
            var calls = 0;

            Mocker.GetMock<ICachedHttpResponseService>()
                .Setup(x => x.Get(It.IsAny<HttpRequest>(), It.IsAny<bool>(), It.IsAny<TimeSpan>()))
                .Returns((HttpRequest request, bool useCache, TimeSpan ttl) =>
                {
                    if (++calls > 1)
                    {
                        return new HttpResponse(request, new HttpHeader(), SearchResponse);
                    }

                    var headers = new HttpHeader();
                    headers.Add("Retry-After", "0");
                    return new HttpResponse(request, headers, "Too Many Requests", HttpStatusCode.TooManyRequests);
                });

            Subject.Search("terry pratchett").Should().HaveCount(2);
            calls.Should().Be(2);
        }

        [Test]
        public void should_throw_when_the_metadata_source_fails()
        {
            Mocker.GetMock<ICachedHttpResponseService>()
                .Setup(x => x.Get(It.IsAny<HttpRequest>(), It.IsAny<bool>(), It.IsAny<TimeSpan>()))
                .Returns((HttpRequest request, bool useCache, TimeSpan ttl) =>
                    new HttpResponse(request, new HttpHeader(), "upstream down", HttpStatusCode.BadRequest));

            Assert.Throws<GoodreadsException>(() => Subject.Search("terry pratchett"));

            ExceptionVerification.ExpectedWarns(1);
        }
    }
}
