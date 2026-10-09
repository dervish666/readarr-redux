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
