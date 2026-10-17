using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.MediaCover;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.MediaCoverTests
{
    [TestFixture]
    public class CoverRequestFixture : TestBase
    {
        [Test]
        public void should_only_allow_public_addresses_and_limit_the_size()
        {
            var request = CoverRequest.Create("https://i.gr-assets.com/cover.jpg", null);

            request.PublicAddressesOnly.Should().BeTrue();
            request.MaxResponseLength.Should().Be(CoverImageFormat.MaxLength);
            request.PrivateAddressHosts.Should().BeEmpty();
        }

        [TestCase("http://192.168.0.190:8790", "192.168.0.190")]
        [TestCase("http://rreading-glasses:8788/", "rreading-glasses")]
        public void should_let_covers_come_from_the_metadata_source_host(string source, string host)
        {
            var request = CoverRequest.Create("http://192.168.0.190:8790/cover/1.jpg", source);

            request.PrivateAddressHosts.Should().BeEquivalentTo(new[] { host });
        }
    }
}
