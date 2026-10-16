using System.Collections.Generic;
using System.Linq;
using System.Net;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Cache;
using NzbDrone.Common.Http;
using NzbDrone.Core.Download.Clients;
using NzbDrone.Core.Download.Clients.QBittorrent;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.Download.DownloadClientTests.QBittorrentTests
{
    [TestFixture]
    public class QBittorrentProxyV2Fixture : CoreTest<QBittorrentProxyV2>
    {
        private QBittorrentSettings _settings;
        private List<HttpRequest> _requests;

        [SetUp]
        public void Setup()
        {
            Mocker.SetConstant<ICacheManager>(Mocker.Resolve<CacheManager>());

            _settings = new QBittorrentSettings
            {
                Host = "127.0.0.1",
                Port = 2222,
                Username = "admin",
                Password = "pass"
            };

            _requests = new List<HttpRequest>();
        }

        private void GivenResponses(string loginContent, HttpStatusCode loginStatus = HttpStatusCode.OK)
        {
            Mocker.GetMock<IHttpClient>()
                  .Setup(s => s.Execute(It.IsAny<HttpRequest>()))
                  .Returns<HttpRequest>(r =>
                  {
                      _requests.Add(r);

                      if (r.Url.FullUri.Contains("/auth/login"))
                      {
                          var headers = new HttpHeader();
                          headers.Add("Set-Cookie", "SID=abc; HttpOnly; path=/");

                          if (loginStatus != HttpStatusCode.OK)
                          {
                              throw new HttpException(new HttpResponse(r, headers, loginContent, loginStatus));
                          }

                          return new HttpResponse(r, headers, loginContent);
                      }

                      return new HttpResponse(r, new HttpHeader(), "2.11.2");
                  });
        }

        [TestCase("Ok.")]
        [TestCase("")]
        public void should_accept_login_with_ok_or_empty_body(string loginContent)
        {
            GivenResponses(loginContent);

            Subject.GetApiVersion(_settings).Should().NotBeNull();

            _requests.Should().Contain(r => r.Url.FullUri.Contains("/auth/login"));
        }

        [Test]
        public void should_reject_login_with_fails_body()
        {
            GivenResponses("Fails.");

            Assert.Throws<DownloadClientAuthenticationException>(() => Subject.GetApiVersion(_settings));
        }

        [TestCase(HttpStatusCode.Unauthorized)]
        [TestCase(HttpStatusCode.Forbidden)]
        public void should_treat_login_401_or_403_as_authentication_failure(HttpStatusCode status)
        {
            GivenResponses(string.Empty, status);

            Assert.Throws<DownloadClientAuthenticationException>(() => Subject.GetApiVersion(_settings));
        }

        [Test]
        public void should_not_send_basic_auth_without_credentials()
        {
            _settings.Username = null;
            _settings.Password = null;

            GivenResponses("Ok.");

            Subject.GetApiVersion(_settings);

            _requests.Should().OnlyContain(r => r.Credentials == null);
        }

        [Test]
        public void should_send_bearer_and_skip_login_when_api_key_set()
        {
            _settings.Username = null;
            _settings.Password = null;
            _settings.ApiKey = "secret";

            GivenResponses("Ok.");

            Subject.GetApiVersion(_settings);

            _requests.Should().NotContain(r => r.Url.FullUri.Contains("/auth/login"));
            _requests.Should().OnlyContain(r => r.Headers["Authorization"] == "Bearer secret");
        }

        [Test]
        public void should_login_again_when_username_changes()
        {
            GivenResponses("Ok.");

            Subject.GetApiVersion(_settings);

            _settings.Username = "other";
            Subject.GetApiVersion(_settings);

            _requests.Count(r => r.Url.FullUri.Contains("/auth/login")).Should().Be(2);
        }
    }
}
