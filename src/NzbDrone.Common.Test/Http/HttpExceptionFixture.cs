using System.Net;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Common.Http;

namespace NzbDrone.Common.Test.Http
{
    [TestFixture]
    public class HttpExceptionFixture
    {
        [TestCase("http://prowlarr.local:9696/7/api?t=caps&apikey=mySecret")]
        [TestCase("http://prowlarr.local:9696/7/api?apikey=mySecret&t=caps")]
        [TestCase("http://indexer.local/api?t=search&api_key=mySecret")]
        [TestCase("http://indexer.local/rss?passkey=mySecret&uid=12345")]
        [TestCase("http://indexer.local/rss?token=mySecret")]
        public void message_should_not_contain_secrets_from_the_url(string url)
        {
            var request = new HttpRequest(url);
            var response = new HttpResponse(request, new HttpHeader(), "", (HttpStatusCode)429);

            var ex = new HttpException(request, response);

            ex.Message.Should().StartWith("HTTP request failed: [429:TooManyRequests] [GET] at [");
            ex.Message.Should().NotContain("mySecret");
            ex.Message.Should().Contain("(removed)");
        }

        [Test]
        public void too_many_requests_message_should_not_contain_apikey()
        {
            var request = new HttpRequest("http://prowlarr.local:9696/7/api?t=caps&apikey=mySecret");
            var response = new HttpResponse(request, new HttpHeader(), "", (HttpStatusCode)429);

            new TooManyRequestsException(request, response).Message.Should().NotContain("mySecret");
        }
    }
}
