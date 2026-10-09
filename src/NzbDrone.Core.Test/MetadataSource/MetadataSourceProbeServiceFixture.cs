using System;
using System.Net;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Cache;
using NzbDrone.Common.Http;
using NzbDrone.Core.MetadataSource;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.MetadataSource
{
    [TestFixture]
    public class MetadataSourceProbeServiceFixture : CoreTest<MetadataSourceProbeService>
    {
        private const string SourceUrl = "http://metadata.local:8790";
        private const string Book = "{\"ForeignId\":1,\"Title\":\"The Hobbit\"}";
        private const string Author = "{\"ForeignId\":656983,\"Name\":\"J.R.R. Tolkien\"}";

        // What rreading-glasses and api.bookinfo.pro send for any path they don't route, such as an extra /v1
        private const string SwaggerHtml = "<!DOCTYPE html><html><head><title>BookInfo Metadata API - Swagger UI</title></head><body></body></html>";

        // rreading-glasses' answer for the probe work, trimmed to one edition with the blurbs blanked
        private string WorkJson => ReadAllText("Files/MetadataSource/work-1540236.json");

        [SetUp]
        public void Setup()
        {
            Mocker.SetConstant<ICacheManager>(Mocker.Resolve<CacheManager>());
        }

        private void GivenResponse(HttpStatusCode statusCode, string content, string contentType = "application/json", string location = null)
        {
            Mocker.GetMock<IHttpClient>()
                  .Setup(s => s.Execute(It.IsAny<HttpRequest>()))
                  .Returns<HttpRequest>(r =>
                  {
                      var headers = new HttpHeader { ContentType = contentType };

                      if (location != null)
                      {
                          headers["Location"] = location;
                      }

                      return new HttpResponse(r, headers, content, statusCode);
                  });
        }

        private void GivenException(Exception exception)
        {
            Mocker.GetMock<IHttpClient>()
                  .Setup(s => s.Execute(It.IsAny<HttpRequest>()))
                  .Throws(exception);
        }

        private void VerifyNoRequest()
        {
            Mocker.GetMock<IHttpClient>()
                  .Verify(s => s.Execute(It.IsAny<HttpRequest>()), Times.Never());
        }

        private void VerifyRequests(int count)
        {
            Mocker.GetMock<IHttpClient>()
                  .Verify(s => s.Execute(It.IsAny<HttpRequest>()), Times.Exactly(count));
        }

        [TestCase(null)]
        [TestCase("")]
        [TestCase("   ")]
        public void should_report_not_configured_without_calling_out(string url)
        {
            Subject.Probe(url).Status.Should().Be(MetadataSourceProbeStatus.NotConfigured);
            Subject.GetCachedProbe(url).Status.Should().Be(MetadataSourceProbeStatus.NotConfigured);

            VerifyNoRequest();
        }

        [TestCase("metadata.local:8790")]
        [TestCase("not a url")]
        [TestCase("ftp://metadata.local/")]
        public void should_report_invalid_url_without_calling_out(string url)
        {
            Subject.Probe(url).Status.Should().Be(MetadataSourceProbeStatus.InvalidUrl);

            VerifyNoRequest();
        }

        [TestCase("http://metadata.local:8790")]
        [TestCase("http://metadata.local:8790/")]
        [TestCase(" http://metadata.local:8790/ ")]
        public void should_request_the_known_work_under_the_base_url(string url)
        {
            GivenResponse(HttpStatusCode.OK, WorkJson);

            Subject.Probe(url);

            Mocker.GetMock<IHttpClient>()
                  .Verify(s => s.Execute(It.Is<HttpRequest>(r =>
                      r.Url.FullUri == "http://metadata.local:8790/work/" + MetadataSourceProbeService.ProbeWorkId &&
                      r.SuppressHttpError &&
                      r.RequestTimeout > TimeSpan.Zero &&
                      r.RequestTimeout <= TimeSpan.FromSeconds(15))), Times.Once());
        }

        [Test]
        public void should_report_ok_when_the_work_comes_back_as_json()
        {
            GivenResponse(HttpStatusCode.OK, WorkJson);

            var result = Subject.Probe(SourceUrl);

            result.Status.Should().Be(MetadataSourceProbeStatus.Ok);
            result.StatusCode.Should().Be(200);
            result.Url.Should().Be(SourceUrl);
        }

        [TestCase(HttpStatusCode.Unauthorized)]
        [TestCase(HttpStatusCode.Forbidden)]
        public void should_report_auth_failure(HttpStatusCode statusCode)
        {
            GivenResponse(statusCode, "unauthorized", "text/plain");

            var result = Subject.Probe(SourceUrl);

            result.Status.Should().Be(MetadataSourceProbeStatus.AuthFailure);
            result.StatusCode.Should().Be((int)statusCode);
            ExceptionVerification.ExpectedWarns(1);
        }

        [TestCase(HttpStatusCode.InternalServerError)]
        [TestCase(HttpStatusCode.BadGateway)]
        [TestCase(HttpStatusCode.ServiceUnavailable)]
        [TestCase(HttpStatusCode.GatewayTimeout)]
        public void should_report_server_error(HttpStatusCode statusCode)
        {
            GivenResponse(statusCode, "<html>bad gateway</html>", "text/html");

            var result = Subject.Probe(SourceUrl);

            result.Status.Should().Be(MetadataSourceProbeStatus.ServerError);
            result.StatusCode.Should().Be((int)statusCode);
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_report_not_found_for_404_on_the_known_work()
        {
            GivenResponse(HttpStatusCode.NotFound, "404 page not found", "text/plain");

            var result = Subject.Probe(SourceUrl);

            result.Status.Should().Be(MetadataSourceProbeStatus.NotFound);
            result.StatusCode.Should().Be(404);
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_report_unexpected_response_when_a_web_page_comes_back_with_200()
        {
            GivenResponse(HttpStatusCode.OK, SwaggerHtml, "text/html");

            Subject.Probe(SourceUrl).Status.Should().Be(MetadataSourceProbeStatus.UnexpectedResponse);
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_report_ok_for_another_book_under_the_probe_id()
        {
            // hardcover.bookinfo.pro numbers its works differently, and 1540236 is a different book there
            GivenResponse(HttpStatusCode.OK, "{\"ForeignId\":1540236,\"Title\":\"The Hellion is Tamed\",\"Books\":[" + Book + "],\"Authors\":[" + Author + "]}");

            Subject.Probe(SourceUrl).Status.Should().Be(MetadataSourceProbeStatus.Ok);
        }

        [TestCase("{\"Ids\":[]}")]
        [TestCase("[]")]
        [TestCase("{\"ForeignId\":\"1540236\",\"Title\":\"The Hobbit\",\"Books\":[" + Book + "],\"Authors\":[" + Author + "]}")]
        [TestCase("{\"foreignId\":1540236,\"title\":\"The Hobbit\",\"books\":[" + Book + "],\"authors\":[" + Author + "]}")]
        [TestCase("{\"ForeignId\":1540236,\"Title\":\"\",\"Books\":[" + Book + "],\"Authors\":[" + Author + "]}")]
        [TestCase("{\"ForeignId\":1540236,\"Title\":\"The Hobbit\"}")]
        [TestCase("{\"ForeignId\":1540236,\"Title\":\"The Hobbit\",\"Books\":[],\"Authors\":[" + Author + "]}")]
        [TestCase("{\"ForeignId\":1540236,\"Title\":\"The Hobbit\",\"Books\":[" + Book + "],\"Authors\":[]}")]
        [TestCase("{\"ForeignId\":1540236,\"Title\":\"The Hobbit\",\"Books\":[" + Book + "]}")]
        [TestCase("{\"ForeignId\":1540236.5,\"Title\":\"The Hobbit\",\"Books\":[" + Book + "],\"Authors\":[" + Author + "]}")]
        [TestCase("{\"ForeignId\":99999999999,\"Title\":\"The Hobbit\",\"Books\":[" + Book + "],\"Authors\":[" + Author + "]}")]
        [TestCase("{\"ForeignId\":42,\"Title\":\"The Hobbit\",\"Books\":[" + Book + "],\"Authors\":[" + Author + "]}")]
        public void should_report_unexpected_response_when_json_is_not_a_work(string json)
        {
            GivenResponse(HttpStatusCode.OK, json);

            Subject.Probe(SourceUrl).Status.Should().Be(MetadataSourceProbeStatus.UnexpectedResponse);
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_report_rate_limited_on_429()
        {
            GivenResponse(HttpStatusCode.TooManyRequests, "slow down", "text/plain");

            var result = Subject.Probe(SourceUrl);

            result.Status.Should().Be(MetadataSourceProbeStatus.RateLimited);
            result.StatusCode.Should().Be(429);
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_not_follow_redirects()
        {
            GivenResponse(HttpStatusCode.OK, WorkJson);

            Subject.Probe(SourceUrl);

            Mocker.GetMock<IHttpClient>()
                  .Verify(s => s.Execute(It.Is<HttpRequest>(r => !r.AllowAutoRedirect)), Times.Once());
        }

        [TestCase(HttpStatusCode.MovedPermanently)]
        [TestCase(HttpStatusCode.Found)]
        [TestCase(HttpStatusCode.SeeOther)]
        [TestCase(HttpStatusCode.TemporaryRedirect)]
        [TestCase(HttpStatusCode.PermanentRedirect)]
        public void should_report_a_redirect_and_where_it_points(HttpStatusCode statusCode)
        {
            GivenResponse(statusCode, string.Empty, "text/plain", "https://metadata.example.org/work/1540236");

            var result = Subject.Probe(SourceUrl);

            result.Status.Should().Be(MetadataSourceProbeStatus.Redirect);
            result.StatusCode.Should().Be((int)statusCode);
            result.Location.Should().Be("https://metadata.example.org/work/1540236");
            result.MessageTokens["location"].Should().Be("https://metadata.example.org/work/1540236");
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_resolve_a_relative_redirect_against_the_request()
        {
            GivenResponse(HttpStatusCode.Found, string.Empty, "text/plain", "/api/work/1540236");

            Subject.Probe(SourceUrl).Location.Should().Be("http://metadata.local:8790/api/work/1540236");
            ExceptionVerification.ExpectedWarns(1);
        }

        [TestCase(HttpStatusCode.BadRequest)]
        [TestCase(HttpStatusCode.NotModified)]
        public void should_report_unexpected_response_for_other_status_codes(HttpStatusCode statusCode)
        {
            GivenResponse(statusCode, "nope", "text/plain");

            var result = Subject.Probe(SourceUrl);

            result.Status.Should().Be(MetadataSourceProbeStatus.UnexpectedResponse);
            result.StatusCode.Should().Be((int)statusCode);
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_report_unreachable_when_the_connection_fails()
        {
            GivenException(new WebException("Connection refused (metadata.local:8790)", WebExceptionStatus.ConnectFailure));

            var result = Subject.Probe(SourceUrl);

            result.Status.Should().Be(MetadataSourceProbeStatus.Unreachable);
            result.StatusCode.Should().BeNull();
            result.Error.Should().Contain("Connection refused");
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_report_unreachable_on_timeout()
        {
            GivenException(new WebException("Http request timed out", WebExceptionStatus.Timeout));

            Subject.Probe(SourceUrl).Status.Should().Be(MetadataSourceProbeStatus.Unreachable);
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void cached_probe_should_reuse_the_result()
        {
            GivenResponse(HttpStatusCode.OK, WorkJson);

            Subject.GetCachedProbe(SourceUrl).Status.Should().Be(MetadataSourceProbeStatus.Ok);
            Subject.GetCachedProbe(SourceUrl + "/").Status.Should().Be(MetadataSourceProbeStatus.Ok);

            VerifyRequests(1);
        }

        [Test]
        public void cached_probe_should_not_share_results_between_urls()
        {
            GivenResponse(HttpStatusCode.OK, WorkJson);

            Subject.GetCachedProbe(SourceUrl);
            Subject.GetCachedProbe("https://api.example.org");

            VerifyRequests(2);
        }

        [Test]
        public void probe_should_skip_the_cache_and_refresh_it()
        {
            GivenResponse(HttpStatusCode.OK, WorkJson);
            Subject.GetCachedProbe(SourceUrl).Status.Should().Be(MetadataSourceProbeStatus.Ok);

            GivenResponse(HttpStatusCode.BadGateway, "bad gateway", "text/plain");
            Subject.Probe(SourceUrl).Status.Should().Be(MetadataSourceProbeStatus.ServerError);

            Subject.GetCachedProbe(SourceUrl).Status.Should().Be(MetadataSourceProbeStatus.ServerError);

            VerifyRequests(2);
            ExceptionVerification.ExpectedWarns(1);
        }

        [TestCase(MetadataSourceProbeStatus.Ok, "MetadataSourceStatusOk")]
        [TestCase(MetadataSourceProbeStatus.NotConfigured, "MetadataSourceStatusNotConfigured")]
        [TestCase(MetadataSourceProbeStatus.InvalidUrl, "MetadataSourceStatusInvalidUrl")]
        [TestCase(MetadataSourceProbeStatus.Unreachable, "MetadataSourceStatusUnreachable")]
        [TestCase(MetadataSourceProbeStatus.AuthFailure, "MetadataSourceStatusAuthFailure")]
        [TestCase(MetadataSourceProbeStatus.ServerError, "MetadataSourceStatusServerError")]
        [TestCase(MetadataSourceProbeStatus.RateLimited, "MetadataSourceStatusRateLimited")]
        [TestCase(MetadataSourceProbeStatus.Redirect, "MetadataSourceStatusRedirect")]
        [TestCase(MetadataSourceProbeStatus.NotFound, "MetadataSourceStatusNotFound")]
        [TestCase(MetadataSourceProbeStatus.UnexpectedResponse, "MetadataSourceStatusUnexpectedResponse")]
        public void every_status_should_have_a_message_key(MetadataSourceProbeStatus status, string key)
        {
            new MetadataSourceProbeResult { Status = status }.MessageKey.Should().Be(key);
        }
    }
}
