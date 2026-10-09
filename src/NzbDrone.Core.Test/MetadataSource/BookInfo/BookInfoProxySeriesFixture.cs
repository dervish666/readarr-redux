using System;
using System.Net;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Http;
using NzbDrone.Core.Http;
using NzbDrone.Core.MetadataSource;
using NzbDrone.Core.MetadataSource.BookInfo;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.MetadataSource.Goodreads
{
    [TestFixture]
    public class BookInfoProxySeriesFixture : CoreTest<BookInfoProxy>
    {
        // Trimmed from a Goodreads-backed rreading-glasses /series/40650 on 2026-10-09
        private const string SeriesResponse = "{\"ForeignId\":40650,\"Title\":\"Discworld\",\"Description\":\"\",\"LinkItems\":[" +
                                              "{\"ForeignWorkId\":194190,\"PositionInSeries\":\"1\",\"SeriesPosition\":1,\"Primary\":false}," +
                                              "{\"ForeignWorkId\":592532,\"PositionInSeries\":\"2\",\"SeriesPosition\":2,\"Primary\":false}],\"KCA\":\"\"}";

        [SetUp]
        public void Setup()
        {
            Mocker.GetMock<IMetadataRequestBuilder>()
                .Setup(s => s.GetRequestBuilder())
                .Returns(new HttpRequestBuilder("http://metadata.test/{route}").CreateFactory());
        }

        [Test]
        public void should_fetch_series_from_the_configured_metadata_source()
        {
            Mocker.GetMock<ICachedHttpResponseService>()
                .Setup(s => s.Get(It.Is<HttpRequest>(r => r.Url.FullUri == "http://metadata.test/series/40650"), It.IsAny<bool>(), It.IsAny<TimeSpan>()))
                .Returns((HttpRequest request, bool useCache, TimeSpan ttl) => new HttpResponse(request, new HttpHeader(), SeriesResponse));

            var series = Subject.GetSeriesInfo(40650);

            series.Title.Should().Be("Discworld");
            series.LinkItems.Should().HaveCount(2);
            series.LinkItems[0].ForeignWorkId.Should().Be(194190);
        }

        [Test]
        public void should_throw_http_exception_when_series_is_not_found()
        {
            Mocker.GetMock<ICachedHttpResponseService>()
                .Setup(s => s.Get(It.IsAny<HttpRequest>(), It.IsAny<bool>(), It.IsAny<TimeSpan>()))
                .Returns((HttpRequest request, bool useCache, TimeSpan ttl) => new HttpResponse(request, new HttpHeader(), "HTTP 404: Not Found", HttpStatusCode.NotFound));

            var ex = Assert.Throws<HttpException>(() => Subject.GetSeriesInfo(40650));

            ex.Response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }
}
