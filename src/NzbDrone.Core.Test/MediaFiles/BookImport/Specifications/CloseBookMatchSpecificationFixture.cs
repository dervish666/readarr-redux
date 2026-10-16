using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.Configuration;
using NzbDrone.Core.MediaFiles.BookImport.Identification;
using NzbDrone.Core.MediaFiles.BookImport.Specifications;
using NzbDrone.Core.Parser.Model;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.MediaFiles.BookImport.Specifications
{
    [TestFixture]
    public class CloseBookMatchSpecificationFixture : CoreTest<CloseBookMatchSpecification>
    {
        private LocalEdition _edition;

        [SetUp]
        public void Setup()
        {
            // author matches, book half matches: equal weights, so a 75% match
            var distance = new Distance();
            distance.Add("author", 0.0);
            distance.Add("book", 0.5);

            _edition = new LocalEdition
            {
                NewDownload = true,
                Distance = distance
            };

            GivenMinimumMatch(80);
        }

        private void GivenMinimumMatch(int percent)
        {
            Mocker.GetMock<IConfigService>()
                  .SetupGet(s => s.MinimumBookMatchPercent)
                  .Returns(percent);
        }

        [Test]
        public void should_reject_below_default_threshold()
        {
            Subject.IsSatisfiedBy(_edition, null).Accepted.Should().BeFalse();
        }

        [Test]
        public void should_report_configured_threshold_in_rejection()
        {
            GivenMinimumMatch(90);

            Subject.IsSatisfiedBy(_edition, null).Reason.Should().Contain("75.0").And.Contain("90");
        }

        [Test]
        public void should_accept_when_threshold_lowered()
        {
            GivenMinimumMatch(70);

            Subject.IsSatisfiedBy(_edition, null).Accepted.Should().BeTrue();
        }

        [Test]
        public void should_clamp_threshold_below_fifty()
        {
            var distance = new Distance();
            distance.Add("author", 1.0);
            distance.Add("book", 0.2);
            _edition.Distance = distance;

            GivenMinimumMatch(0);

            Subject.IsSatisfiedBy(_edition, null).Accepted.Should().BeFalse();
        }
    }
}
