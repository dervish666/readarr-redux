using FluentAssertions;
using Microsoft.AspNetCore.HostFiltering;
using Moq;
using NLog;
using NUnit.Framework;
using NzbDrone.Core.Configuration;
using NzbDrone.Host;

namespace NzbDrone.App.Test
{
    [TestFixture]
    public class ConfigureHostFilteringOptionsFixture
    {
        private static HostFilteringOptions GetOptions(string allowedHosts)
        {
            var configFileProvider = new Mock<IConfigFileProvider>();
            configFileProvider.SetupGet(c => c.AllowedHosts).Returns(allowedHosts);

            var options = new HostFilteringOptions();

            new ConfigureHostFilteringOptions(configFileProvider.Object, LogManager.CreateNullLogger()).Configure(options);

            return options;
        }

        [TestCase("")]
        [TestCase("0.0.0.0")]
        [TestCase("::")]
        [TestCase("0.0.0.0, [::]")]
        public void should_allow_any_host_when_only_bind_addresses_are_configured(string allowedHosts)
        {
            GetOptions(allowedHosts).AllowedHosts.Should().BeEquivalentTo("*");
        }

        [Test]
        public void should_allow_configured_hosts_loopback_and_server_name()
        {
            var hosts = GetOptions("readarr.example.com; *.home.example.com, 192.168.0.190, ::1").AllowedHosts;

            hosts.Should().Contain(new[] { "readarr.example.com", "*.home.example.com", "192.168.0.190", "localhost", "127.0.0.1", "[::1]", System.Environment.MachineName });
            hosts.Should().NotContain("*");
        }

        [Test]
        public void should_skip_bind_addresses_when_host_names_are_configured()
        {
            var hosts = GetOptions("readarr.local, 0.0.0.0, [::]").AllowedHosts;

            hosts.Should().Contain("readarr.local");
            hosts.Should().Contain("localhost");
            hosts.Should().NotContain("0.0.0.0");
            hosts.Should().NotContain("[::]");
            hosts.Should().NotContain("*");
        }
    }
}
