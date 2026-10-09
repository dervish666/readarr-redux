using System;
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
    }
}
