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

namespace NzbDrone.Core.Test.MetadataSource.Goodreads
{
    // SeerrNG asks /api/v1/book/lookup?term=736145 with a bare Goodreads work id. rreading-glasses' /search answers []
    // for a number, so the term has to be looked up as a work as well.
    [TestFixture]
    public class BookInfoProxyNumericLookupFixture : CoreTest<BookInfoProxy>
    {
        private const string AuthorResponse = "{\"ForeignId\":123,\"Name\":\"Some Author\",\"Works\":[{\"ForeignId\":736145,\"Title\":\"Some Work\"," +
                                              "\"Books\":[{\"ForeignId\":999,\"Title\":\"Some Work\",\"Contributors\":[{\"ForeignId\":123,\"Role\":\"Author\"}]}]}],\"Series\":[]}";

        [SetUp]
        public void Setup()
        {
            Mocker.GetMock<IMetadataRequestBuilder>()
                .Setup(s => s.GetRequestBuilder())
                .Returns(new HttpRequestBuilder("http://metadata.test/{route}").CreateFactory());

            Mocker.GetMock<IGoodreadsSearchProxy>()
                .Setup(s => s.Search(It.IsAny<string>()))
                .Returns(new List<SearchJsonResource>());

            Mocker.GetMock<IHttpClient>()
                .Setup(s => s.Get(It.Is<HttpRequest>(r => r.Url.FullUri.EndsWith("/work/736145"))))
                .Returns((HttpRequest request) =>
                {
                    var headers = new HttpHeader();
                    headers.Add("Location", "http://metadata.test/author/123");
                    return new HttpResponse(request, headers, string.Empty, HttpStatusCode.Found);
                });

            Mocker.GetMock<ICachedHttpResponseService>()
                .Setup(s => s.Get(It.Is<HttpRequest>(r => r.Url.FullUri.EndsWith("/author/123")), It.IsAny<bool>(), It.IsAny<TimeSpan>()))
                .Returns((HttpRequest request, bool useCache, TimeSpan ttl) => new HttpResponse(request, new HttpHeader(), AuthorResponse));

            Subject.Sleep = t => { };
        }

        private void VerifyNoWorkLookup()
        {
            Mocker.GetMock<IHttpClient>()
                .Verify(v => v.Get(It.Is<HttpRequest>(r => r.Url.FullUri.Contains("/work/"))), Times.Never());
        }

        [Test]
        public void should_look_up_a_bare_number_as_a_work()
        {
            var books = Subject.SearchForNewBook("736145", null);

            books.Should().ContainSingle(b => b.ForeignBookId == "736145");
        }

        [Test]
        public void should_return_the_same_as_a_work_prefixed_term()
        {
            var bare = Subject.SearchForNewBook(" 736145 ", null);
            var prefixed = Subject.SearchForNewBook("work:736145", null);

            bare.Should().ContainSingle(b => b.ForeignBookId == "736145");
            prefixed.Should().ContainSingle(b => b.ForeignBookId == "736145");
        }

        [Test]
        public void should_still_run_free_text_search_for_a_bare_number()
        {
            // A title can be a number ("1984"), so the text search still runs alongside the work lookup
            Subject.SearchForNewBook("736145", null);

            Mocker.GetMock<IGoodreadsSearchProxy>()
                .Verify(v => v.Search("736145"), Times.Once());
        }

        [TestCase("736145a")]
        [TestCase("736 145")]
        [TestCase("1984 orwell")]
        public void should_only_free_text_search_a_term_mixing_digits_and_other_characters(string term)
        {
            Subject.SearchForNewBook(term, null).Should().BeEmpty();

            VerifyNoWorkLookup();
            Mocker.GetMock<IGoodreadsSearchProxy>()
                .Verify(v => v.Search(It.IsAny<string>()), Times.Once());
        }

        [TestCase("0316769487")]
        [TestCase("9780316769488")]
        public void should_treat_isbn_length_numbers_as_free_text(string isbn)
        {
            Subject.SearchForNewBook(isbn, null);

            VerifyNoWorkLookup();
            Mocker.GetMock<IGoodreadsSearchProxy>()
                .Verify(v => v.Search(isbn), Times.Once());
        }

        [Test]
        public void should_not_treat_a_number_as_a_work_when_an_author_is_given()
        {
            // Import identification searches tag titles with the author tag appended
            Subject.SearchForNewBook("1984", "George Orwell");

            VerifyNoWorkLookup();
        }

        [Test]
        public void should_keep_work_prefix_without_free_text_search()
        {
            Subject.SearchForNewBook("work:736145", null).Should().ContainSingle(b => b.ForeignBookId == "736145");

            Mocker.GetMock<IGoodreadsSearchProxy>()
                .Verify(v => v.Search(It.IsAny<string>()), Times.Never());
        }

        [Test]
        public void should_keep_isbn_prefix_as_search_of_the_isbn()
        {
            Subject.SearchForNewBook("isbn:9780316769488", null);

            VerifyNoWorkLookup();
            Mocker.GetMock<IGoodreadsSearchProxy>()
                .Verify(v => v.Search("9780316769488"), Times.Once());
        }
    }
}
