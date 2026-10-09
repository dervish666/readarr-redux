using System;
using System.Collections.Generic;
using System.Net;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Http;
using NzbDrone.Core.Exceptions;
using NzbDrone.Core.Http;
using NzbDrone.Core.MetadataSource;
using NzbDrone.Core.MetadataSource.BookInfo;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.MetadataSource.Goodreads
{
    [TestFixture]
    public class BookInfoProxyEditionWorkFixture : CoreTest<BookInfoProxy>
    {
        // rreading-glasses on 2026-10-09: /book/55199924 answered 303 to /author/1069006?edition=55199924, and that
        // author payload held only work 4275749, whose edition credits author 36289 rather than 1069006
        private const string EditionAuthorResponse = "{\"ForeignId\":1069006,\"Name\":\"C.S. Lewis\",\"Works\":[{\"ForeignId\":4275749,\"Title\":\"Arthurian Torso\"," +
                                                     "\"Books\":[{\"ForeignId\":55199924,\"Title\":\"Arthurian Torso\",\"Contributors\":[{\"ForeignId\":36289,\"Role\":\"Author\"}]}]}],\"Series\":[]}";

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

        private void GivenEditionResponse(HttpStatusCode statusCode, string location = null)
        {
            Mocker.GetMock<IHttpClient>()
                .Setup(s => s.Get(It.Is<HttpRequest>(r => r.Url.FullUri.EndsWith("/book/55199924"))))
                .Returns((HttpRequest request) =>
                {
                    var headers = new HttpHeader();

                    if (location != null)
                    {
                        headers.Add("Location", location);
                    }

                    return new HttpResponse(request, headers, string.Empty, statusCode);
                });
        }

        private void GivenAuthorResponse(string content, HttpHeader headers = null)
        {
            Mocker.GetMock<ICachedHttpResponseService>()
                .Setup(s => s.Get(It.Is<HttpRequest>(r => r.Url.FullUri.EndsWith("/author/1069006?edition=55199924")), It.IsAny<bool>(), It.IsAny<TimeSpan>()))
                .Returns((HttpRequest request, bool useCache, TimeSpan ttl) => new HttpResponse(request, headers ?? new HttpHeader(), content));
        }

        [Test]
        public void should_return_the_work_the_edition_redirects_to_even_when_another_author_is_credited()
        {
            GivenEditionResponse(HttpStatusCode.SeeOther, "/author/1069006?edition=55199924");
            GivenAuthorResponse(EditionAuthorResponse);

            Subject.GetWorkIdForEdition("55199924").Should().Be("4275749");
        }

        [Test]
        public void should_not_place_the_edition_from_a_cached_author_payload()
        {
            GivenEditionResponse(HttpStatusCode.SeeOther, "/author/1069006?edition=55199924");
            GivenAuthorResponse(EditionAuthorResponse);

            Subject.GetWorkIdForEdition("55199924");

            // A cached payload up to 30 minutes old could place the edition in a work it has since left
            Mocker.GetMock<ICachedHttpResponseService>()
                .Verify(v => v.Get(It.IsAny<HttpRequest>(), true, It.IsAny<TimeSpan>()), Times.Never());

            Mocker.GetMock<ICachedHttpResponseService>()
                .Verify(v => v.Get(It.IsAny<HttpRequest>(), false, It.IsAny<TimeSpan>()), Times.Once());
        }

        [Test]
        public void should_report_edition_not_found_when_the_edition_404s()
        {
            GivenEditionResponse(HttpStatusCode.NotFound);

            Assert.Throws<EditionNotFoundException>(() => Subject.GetWorkIdForEdition("55199924"));
        }

        [Test]
        public void should_not_report_edition_not_found_when_the_edition_lookup_errors()
        {
            GivenEditionResponse(HttpStatusCode.InternalServerError);

            Assert.Throws<BookInfoException>(() => Subject.GetWorkIdForEdition("55199924"));
        }

        [Test]
        public void should_not_report_edition_not_found_when_the_author_list_leaves_it_out()
        {
            GivenEditionResponse(HttpStatusCode.SeeOther, "/author/1069006?edition=55199924");
            GivenAuthorResponse("{\"ForeignId\":1069006,\"Name\":\"C.S. Lewis\",\"Works\":[],\"Series\":[]}");

            Assert.Throws<BookInfoException>(() => Subject.GetWorkIdForEdition("55199924"));
        }

        [Test]
        public void should_not_use_a_stale_cached_author_to_place_the_edition()
        {
            var headers = new HttpHeader();
            headers.Add(CachedHttpResponseService.StaleResponseHeader, "2026-10-01T00:00:00Z");

            GivenEditionResponse(HttpStatusCode.SeeOther, "/author/1069006?edition=55199924");
            GivenAuthorResponse(EditionAuthorResponse, headers);

            Assert.Throws<BookInfoException>(() => Subject.GetWorkIdForEdition("55199924"));
        }

        [Test]
        public void should_not_retry_the_edition_lookup_past_the_retry_budget()
        {
            GivenEditionResponse(HttpStatusCode.ServiceUnavailable);

            using (MetadataRetryBudget.Start(TimeSpan.Zero))
            {
                Assert.Throws<BookInfoException>(() => Subject.GetWorkIdForEdition("55199924"));
            }

            Mocker.GetMock<IHttpClient>().Verify(s => s.Get(It.IsAny<HttpRequest>()), Times.Once());
            _sleeps.Should().BeEmpty();
        }
    }
}
