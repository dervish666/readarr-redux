using System;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Cache;
using NzbDrone.Common.Extensions;
using NzbDrone.Common.Http;
using NzbDrone.Common.Http.Dispatchers;
using NzbDrone.Common.Http.Proxy;
using NzbDrone.Test.Common;

namespace NzbDrone.Common.Test.Http
{
    [TestFixture]
    public class PublicAddressFixture : TestBase
    {
        [TestCase("127.0.0.1")]
        [TestCase("10.1.2.3")]
        [TestCase("172.16.0.1")]
        [TestCase("192.168.0.190")]
        [TestCase("169.254.169.254")]
        [TestCase("100.64.0.1")]
        [TestCase("0.0.0.0")]
        [TestCase("224.0.0.1")]
        [TestCase("198.18.0.1")]
        [TestCase("::1")]
        [TestCase("::")]
        [TestCase("fe80::1")]
        [TestCase("fd00::1")]
        [TestCase("ff02::1")]
        [TestCase("::ffff:127.0.0.1")]
        [TestCase("::ffff:192.168.1.1")]
        public void should_not_be_public(string address)
        {
            IPAddress.Parse(address).IsPublicAddress().Should().BeFalse();
        }

        [TestCase("8.8.8.8")]
        [TestCase("151.101.1.1")]
        [TestCase("2606:4700::1111")]
        [TestCase("::ffff:8.8.8.8")]
        public void should_be_public(string address)
        {
            IPAddress.Parse(address).IsPublicAddress().Should().BeTrue();
        }

        [Test]
        public void should_refuse_a_host_with_any_private_address()
        {
            Action act = () => ManagedHttpDispatcher.CheckPublicAddresses("cover.example", new[] { IPAddress.Parse("8.8.8.8"), IPAddress.Parse("10.0.0.1") });

            act.Should().Throw<PrivateAddressRefusedException>();
        }

        [Test]
        public void should_allow_a_host_with_only_public_addresses()
        {
            Action act = () => ManagedHttpDispatcher.CheckPublicAddresses("cover.example", new[] { IPAddress.Parse("8.8.8.8"), IPAddress.Parse("2606:4700::1111") });

            act.Should().NotThrow();
        }

        // A real dispatcher against a listener on loopback, so the check is the one made at connect time
        private static HttpResponse GetFromLoopback(Action<HttpRequest> configure)
        {
            var listener = new TcpListener(IPAddress.Loopback, 0);
            listener.Start();

            try
            {
                var port = ((IPEndPoint)listener.LocalEndpoint).Port;

                _ = Task.Run(async () =>
                {
                    using var client = await listener.AcceptTcpClientAsync();
                    using var stream = client.GetStream();
                    var buffer = new byte[4096];
                    var request = new StringBuilder();

                    while (!request.ToString().Contains("\r\n\r\n"))
                    {
                        var read = await stream.ReadAsync(buffer);

                        if (read == 0)
                        {
                            return;
                        }

                        request.Append(Encoding.ASCII.GetString(buffer, 0, read));
                    }

                    var body = Encoding.ASCII.GetBytes("HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\nok");
                    await stream.WriteAsync(body);
                });

                var userAgent = new Mock<IUserAgentBuilder>();
                userAgent.Setup(s => s.GetUserAgent(It.IsAny<bool>())).Returns("Readarr/1.0");

                var dispatcher = new ManagedHttpDispatcher(Mock.Of<IHttpProxySettingsProvider>(), Mock.Of<ICreateManagedWebProxy>(), Mock.Of<ICertificateValidationService>(), userAgent.Object, new CacheManager(), TestLogger);
                var request = new HttpRequest($"http://127.0.0.1:{port}/cover.jpg") { RequestTimeout = TimeSpan.FromSeconds(10) };
                configure(request);

                return dispatcher.GetResponseAsync(request, new CookieContainer()).GetAwaiter().GetResult();
            }
            finally
            {
                listener.Stop();
            }
        }

        [Test]
        public void should_refuse_to_connect_to_loopback_for_a_public_only_request()
        {
            Action act = () => GetFromLoopback(r => r.PublicAddressesOnly = true);

            act.Should().Throw<Exception>().Where(e => e.GetBaseException() is PrivateAddressRefusedException);
        }

        [Test]
        public void should_connect_to_an_exempt_private_host()
        {
            var response = GetFromLoopback(r =>
            {
                r.PublicAddressesOnly = true;
                r.PrivateAddressHosts.Add("127.0.0.1");
            });

            response.Content.Should().Be("ok");
        }

        [Test]
        public void should_connect_to_loopback_without_the_policy()
        {
            var response = GetFromLoopback(r => { });

            response.Content.Should().Be("ok");
        }
    }
}
