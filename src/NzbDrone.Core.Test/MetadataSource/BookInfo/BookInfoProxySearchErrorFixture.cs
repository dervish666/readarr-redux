using System;
using System.Collections.Generic;
using System.Net;
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
    public class BookInfoProxySearchErrorFixture : CoreTest<BookInfoProxy>
    {
        [SetUp]
        public void Setup()
        {
            Mocker.GetMock<IMetadataRequestBuilder>()
                .Setup(s => s.GetRequestBuilder())
                .Returns(new HttpRequestBuilder("http://metadata.test/{route}").CreateFactory());

            Mocker.GetMock<IGoodreadsSearchProxy>()
                .Setup(s => s.Search(It.IsAny<string>()))
                .Returns(new List<SearchJsonResource>
                {
                    new SearchJsonResource { BookId = 11, WorkId = 1, Author = new AuthorJsonResource { Id = 5 } },
                    new SearchJsonResource { BookId = 21, WorkId = 2, Author = new AuthorJsonResource { Id = 5 } }
                });

            Subject.Sleep = t => { };
        }

        private void GivenMetadataSourceFailing()
        {
            Mocker.GetMock<IHttpClient>()
                .Setup(s => s.Get(It.IsAny<HttpRequest>()))
                .Returns<HttpRequest>(r => new HttpResponse(r, new HttpHeader(), "Bad Gateway", HttpStatusCode.BadGateway));

            Mocker.GetMock<ICachedHttpResponseService>()
                .Setup(s => s.Get(It.IsAny<HttpRequest>(), It.IsAny<bool>(), It.IsAny<TimeSpan>()))
                .Returns((HttpRequest request, bool useCache, TimeSpan ttl) => new HttpResponse(request, new HttpHeader(), "Bad Gateway", HttpStatusCode.BadGateway));
        }

        // /search answered, but looking up what it found failed: that is an outage, not "no such book"
        [TestCase("author:1654")]
        [TestCase("work:194190")]
        [TestCase("edition:13153953")]
        public void should_throw_when_looking_up_by_id_fails(string query)
        {
            GivenMetadataSourceFailing();

            Assert.Throws<BookInfoException>(() => Subject.SearchForNewBook(query, null));

            ExceptionVerification.IgnoreWarns();
        }

        [Test]
        public void should_throw_when_hydrating_isbn_search_results_fails()
        {
            GivenMetadataSourceFailing();

            Assert.Throws<BookInfoException>(() => Subject.SearchByIsbn("9780552166591"));

            ExceptionVerification.IgnoreWarns();
        }

        private void GivenBulkResponse(string body)
        {
            Mocker.GetMock<IHttpClient>()
                .Setup(s => s.Post(It.IsAny<HttpRequest>()))
                .Returns<HttpRequest>(r => new HttpResponse(r, new HttpHeader(), body));
        }

        [Test]
        public void should_throw_when_isbn_search_fails_instead_of_reporting_no_match()
        {
            Mocker.GetMock<IGoodreadsSearchProxy>()
                .Setup(s => s.Search(It.IsAny<string>()))
                .Throws(new GoodreadsException("Search for '{0}' failed. Unable to communicate with the metadata source.", "9780552166591"));

            // GoodreadsSearchProxy has already logged the failure
            Assert.Throws<BookInfoException>(() => Subject.SearchByIsbn("9780552166591"));
        }

        [Test]
        public void should_throw_when_search_results_cannot_be_read()
        {
            GivenBulkResponse("<html>Bad Gateway</html>");

            Assert.Throws<BookInfoException>(() => Subject.SearchForNewBook("one", null, false));

            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_skip_work_without_contributors_and_keep_the_rest()
        {
            GivenBulkResponse("{\"Works\":[" +
                              "{\"ForeignId\":1,\"Title\":\"One\",\"Books\":[{\"ForeignId\":11,\"Title\":\"One\",\"Contributors\":[]}],\"Authors\":[]}," +
                              "{\"ForeignId\":2,\"Title\":\"Two\",\"Books\":[{\"ForeignId\":21,\"Title\":\"Two\",\"Contributors\":[{\"ForeignId\":5}]}],\"Authors\":[{\"ForeignId\":5,\"Name\":\"Author Five\"}]}]," +
                              "\"Series\":[],\"Authors\":[{\"ForeignId\":5,\"Name\":\"Author Five\"}]}");

            var books = Subject.SearchForNewBook("one", null, false);

            books.Should().ContainSingle(b => b.ForeignBookId == "2");
            ExceptionVerification.ExpectedWarns(1);
        }
    }
}
