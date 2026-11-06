using System.IO;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Http;
using NzbDrone.Core.Books.Calibre;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.MusicTests
{
    [TestFixture]
    public class CalibreConversionFixture : CoreTest<CalibreProxy>
    {
        private CalibreSettings _settings;

        [SetUp]
        public void Setup()
        {
            _settings = new CalibreSettings { Host = "localhost", Port = 8080, Library = "test" };
            Mocker.GetMock<IHttpClient>().Setup(x => x.Post<long>(It.IsAny<HttpRequest>()))
                .Returns(new HttpResponse<long>(new HttpResponse(new HttpRequest("http://localhost"), new HttpHeader(), "123")));
        }

        [Test]
        public void should_fail_import_when_the_conversion_job_fails()
        {
            Mocker.GetMock<IHttpClient>().Setup(x => x.Get<CalibreConversionStatus>(It.IsAny<HttpRequest>()))
                .Returns(new HttpResponse<CalibreConversionStatus>(new HttpResponse(new HttpRequest("http://localhost"), new HttpHeader(), "{\"running\":false,\"ok\":false}")));

            FluentActions.Invoking(() => Subject.ConvertBook(7, new CalibreConversionOptions(), _settings))
                .Should().Throw<CalibreException>().WithMessage("*not committed*");
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_fail_import_when_conversion_status_is_unavailable()
        {
            Mocker.GetMock<IHttpClient>().Setup(x => x.Get<CalibreConversionStatus>(It.IsAny<HttpRequest>()))
                .Throws(new IOException("connection lost"));

            FluentActions.Invoking(() => Subject.ConvertBook(7, new CalibreConversionOptions(), _settings))
                .Should().Throw<CalibreException>().WithMessage("*not committed*");
        }

        [Test]
        public void should_observe_conversion_success_before_returning()
        {
            Mocker.GetMock<IHttpClient>().Setup(x => x.Get<CalibreConversionStatus>(It.IsAny<HttpRequest>()))
                .Returns(new HttpResponse<CalibreConversionStatus>(new HttpResponse(new HttpRequest("http://localhost"), new HttpHeader(), "{\"running\":false,\"ok\":true}")));

            Subject.ConvertBook(7, new CalibreConversionOptions(), _settings).Should().Be(123);
            Mocker.GetMock<IHttpClient>().Verify(x => x.Get<CalibreConversionStatus>(It.IsAny<HttpRequest>()), Times.Once());
        }
    }
}
