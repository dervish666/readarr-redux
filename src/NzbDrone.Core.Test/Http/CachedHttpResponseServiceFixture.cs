using System;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Http;
using NzbDrone.Core.Http;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.Http
{
    [TestFixture]
    public class CachedHttpResponseServiceFixture : CoreTest<CachedHttpResponseService>
    {
        [Test]
        public void should_return_response_even_if_caching_it_fails()
        {
            var request = new HttpRequest("https://api.example.org/author/1");

            Mocker.GetMock<IHttpClient>()
                .Setup(s => s.Get(It.IsAny<HttpRequest>()))
                .Returns<HttpRequest>(r => new HttpResponse(r, new HttpHeader(), "{\"id\":1}"));

            Mocker.GetMock<ICachedHttpResponseRepository>()
                .Setup(s => s.Upsert(It.IsAny<CachedHttpResponse>()))
                .Throws(new InvalidOperationException("database is locked"));

            var response = Subject.Get(request, true, TimeSpan.FromHours(1));

            response.Content.Should().Be("{\"id\":1}");
            ExceptionVerification.ExpectedWarns(1);
        }
    }
}
