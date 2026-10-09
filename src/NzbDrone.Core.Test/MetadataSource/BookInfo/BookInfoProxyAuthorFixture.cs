using System;
using System.Linq;
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
    public class BookInfoProxyAuthorFixture : CoreTest<BookInfoProxy>
    {
        private const string AuthorResponse = "{\"ForeignId\":5,\"Name\":\"Author Five\",\"Works\":[],\"Series\":[]}";

        [SetUp]
        public void Setup()
        {
            Mocker.GetMock<IMetadataRequestBuilder>()
                .Setup(s => s.GetRequestBuilder())
                .Returns(new HttpRequestBuilder("http://metadata.test/{route}").CreateFactory());

            Mocker.GetMock<ICachedHttpResponseService>()
                .Setup(s => s.Get(It.IsAny<HttpRequest>(), It.IsAny<bool>(), It.IsAny<TimeSpan>()))
                .Returns((HttpRequest request, bool useCache, TimeSpan ttl) => new HttpResponse(request, new HttpHeader(), AuthorResponse));
        }

        [TestCase(true)]
        [TestCase(false)]
        public void should_pass_use_cache_through_to_the_http_cache(bool useCache)
        {
            Subject.GetAuthorInfo("5", useCache).Metadata.Value.Name.Should().Be("Author Five");

            Mocker.GetMock<ICachedHttpResponseService>()
                .Verify(s => s.Get(It.Is<HttpRequest>(r => r.Url.FullUri == "http://metadata.test/author/5"), useCache, It.IsAny<TimeSpan>()), Times.Once());
        }

        [TestCase("https://www.goodreads.com", "Goodreads")]
        [TestCase("https://hardcover.app", "Hardcover")]
        public void should_label_links_with_the_site_they_point_to(string site, string expected)
        {
            var author = "{\"ForeignId\":5,\"Name\":\"Author Five\",\"Url\":\"" + site + "/authors/5\",\"Series\":[],\"Works\":[{\"ForeignId\":1,\"Title\":\"One\"," +
                         "\"Url\":\"" + site + "/books/one\",\"Books\":[{\"ForeignId\":11,\"Title\":\"One\",\"Url\":\"" + site + "/books/one/11\"," +
                         "\"Contributors\":[{\"ForeignId\":5}]}]}]}";

            Mocker.GetMock<ICachedHttpResponseService>()
                .Setup(s => s.Get(It.IsAny<HttpRequest>(), It.IsAny<bool>(), It.IsAny<TimeSpan>()))
                .Returns((HttpRequest request, bool useCache, TimeSpan ttl) => new HttpResponse(request, new HttpHeader(), author));

            var result = Subject.GetAuthorInfo("5", false);
            var book = result.Books.Value.Single();

            result.Metadata.Value.Links.Single().Name.Should().Be(expected);
            book.Links.Single().Name.Should().Be(expected + " Editions");
            book.Editions.Value.Single().Links.Single().Name.Should().Be(expected + " Book");
        }

        [Test]
        public void should_read_ids_too_big_for_an_int()
        {
            // rreading-glasses serves IDs as int64
            const string author = "{\"ForeignId\":3000000000,\"Name\":\"Big Author\",\"Series\":[],\"Works\":[{\"ForeignId\":3000000001,\"Title\":\"Big\"," +
                                  "\"RelatedWorks\":[3000000005],\"Books\":[{\"ForeignId\":3000000002,\"Title\":\"Big\",\"Contributors\":[{\"ForeignId\":3000000000}]}]}]}";

            Mocker.GetMock<ICachedHttpResponseService>()
                .Setup(s => s.Get(It.IsAny<HttpRequest>(), It.IsAny<bool>(), It.IsAny<TimeSpan>()))
                .Returns((HttpRequest request, bool useCache, TimeSpan ttl) => new HttpResponse(request, new HttpHeader(), author));

            var result = Subject.GetAuthorInfo("3000000000", false);
            var book = result.Books.Value.Single();

            result.ForeignAuthorId.Should().Be("3000000000");
            book.ForeignBookId.Should().Be("3000000001");
            book.Editions.Value.Single().ForeignEditionId.Should().Be("3000000002");
        }

        // rreading-glasses answers /book/{id} with 303 to /author/{author}?edition={id}, an author holding just that edition
        [TestCase("/author/1654?edition=13153953")]
        [TestCase("/author/1654/?edition=13153953")]
        [TestCase("http://metadata.test/author/1654?edition=13153953")]
        public void should_follow_edition_redirect_to_the_author_holding_that_edition(string location)
        {
            const string author = "{\"ForeignId\":1654,\"Name\":\"Terry Pratchett\",\"Series\":[],\"Works\":[{\"ForeignId\":194190,\"Title\":\"The Colour of Magic\"," +
                                  "\"Books\":[{\"ForeignId\":13153953,\"Title\":\"The Colour of Magic\",\"Contributors\":[{\"ForeignId\":1654}]}]}]}";

            Mocker.GetMock<IHttpClient>()
                .Setup(s => s.Get(It.Is<HttpRequest>(r => r.Url.FullUri == "http://metadata.test/book/13153953")))
                .Returns((HttpRequest request) =>
                {
                    var headers = new HttpHeader();
                    headers.Add("Location", location);
                    return new HttpResponse(request, headers, string.Empty, HttpStatusCode.SeeOther);
                });

            Mocker.GetMock<ICachedHttpResponseService>()
                .Setup(s => s.Get(It.IsAny<HttpRequest>(), It.IsAny<bool>(), It.IsAny<TimeSpan>()))
                .Returns((HttpRequest request, bool useCache, TimeSpan ttl) => new HttpResponse(request, new HttpHeader(), author));

            var books = Subject.SearchByGoodreadsBookId(13153953, false);

            books.Should().ContainSingle(b => b.ForeignBookId == "194190");
            Mocker.GetMock<ICachedHttpResponseService>()
                .Verify(s => s.Get(It.Is<HttpRequest>(r => r.Url.Path == "/author/1654" && r.Url.Query == "edition=13153953"), It.IsAny<bool>(), It.IsAny<TimeSpan>()), Times.Once());
        }
    }
}
