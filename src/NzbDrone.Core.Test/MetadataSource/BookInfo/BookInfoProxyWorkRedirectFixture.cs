using System;
using System.Net;
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
    public class BookInfoProxyWorkRedirectFixture : CoreTest<BookInfoProxy>
    {
        [SetUp]
        public void Setup()
        {
            Mocker.GetMock<IMetadataRequestBuilder>()
                .Setup(s => s.GetRequestBuilder())
                .Returns(new HttpRequestBuilder("http://metadata.test/{route}").CreateFactory());
        }

        [Test]
        public void should_not_report_book_not_found_when_work_redirects_to_an_author_list_without_it()
        {
            Mocker.GetMock<IHttpClient>()
                .Setup(s => s.Get(It.Is<HttpRequest>(r => r.Url.FullUri.EndsWith("/work/1"))))
                .Returns((HttpRequest request) =>
                {
                    var headers = new HttpHeader();
                    headers.Add("Location", "http://metadata.test/author/123");
                    return new HttpResponse(request, headers, string.Empty, HttpStatusCode.Found);
                });

            // The author's works list can be truncated, so the book being absent from it proves nothing
            Mocker.GetMock<ICachedHttpResponseService>()
                .Setup(s => s.Get(It.Is<HttpRequest>(r => r.Url.FullUri.EndsWith("/author/123")), It.IsAny<bool>(), It.IsAny<TimeSpan>()))
                .Returns((HttpRequest request, bool useCache, TimeSpan ttl) =>
                    new HttpResponse(request, new HttpHeader(), "{\"ForeignId\":123,\"Name\":\"Some Author\",\"Works\":[],\"Series\":[]}"));

            Assert.Throws<BookInfoException>(() => Subject.GetBookInfo("1"));
        }
    }
}
