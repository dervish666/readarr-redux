using System.Collections.Generic;
using System.Linq;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Core.DecisionEngine.Specifications;
using NzbDrone.Core.Parser.Model;
using NzbDrone.Core.Qualities;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.DecisionEngineTests
{
    [TestFixture]
    public class AcceptableSizeSpecificationFixture : CoreTest<AcceptableSizeSpecification>
    {
        private const long Megabyte = 1024L * 1024L;

        private RemoteBook _remoteBook;
        private Dictionary<Quality, QualityDefinition> _definitions;

        private static IEnumerable<Quality> AudioQualities => new[] { Quality.UnknownAudio, Quality.MP3, Quality.M4B, Quality.FLAC };
        private static IEnumerable<Quality> EbookQualities => new[] { Quality.Unknown, Quality.PDF, Quality.MOBI, Quality.EPUB, Quality.AZW3 };

        [SetUp]
        public void Setup()
        {
            // Every quality gets a 10 MB minimum here, so the ebook tests prove the type is exempt, not the setting
            _definitions = Quality.All.ToDictionary(q => q, q => new QualityDefinition(q) { MinSize = MegabytesInKilobits(10), MaxSize = null });

            Mocker.GetMock<IQualityDefinitionService>()
                  .Setup(s => s.Get(It.IsAny<Quality>()))
                  .Returns<Quality>(q => _definitions[q]);

            _remoteBook = new RemoteBook
            {
                ParsedBookInfo = new ParsedBookInfo { Quality = new QualityModel(Quality.MP3) },
                Release = new ReleaseInfo { Title = "Isaac Asimov - Second Foundation - 3" }
            };
        }

        private static double MegabytesInKilobits(double megabytes)
        {
            return megabytes * Megabyte / 128;
        }

        private void GivenQuality(Quality quality)
        {
            _remoteBook.ParsedBookInfo.Quality = new QualityModel(quality);
        }

        private void GivenSize(double megabytes)
        {
            _remoteBook.Release.Size = (long)(megabytes * Megabyte);
        }

        [Test]
        public void should_reject_5mb_mp3_release()
        {
            GivenSize(5);

            var decision = Subject.IsSatisfiedBy(_remoteBook, null);

            decision.Accepted.Should().BeFalse();
            decision.Reason.Should().Be("Release is 5.0 MB, smaller than the minimum size for MP3 (10.0 MB)");
        }

        [Test]
        public void should_accept_15mb_mp3_release()
        {
            GivenSize(15);

            Subject.IsSatisfiedBy(_remoteBook, null).Accepted.Should().BeTrue();
        }

        [Test]
        public void should_accept_release_exactly_at_minimum()
        {
            GivenSize(10);

            Subject.IsSatisfiedBy(_remoteBook, null).Accepted.Should().BeTrue();
        }

        [TestCaseSource(nameof(AudioQualities))]
        public void should_reject_small_release_for_every_audio_quality(Quality quality)
        {
            GivenQuality(quality);
            GivenSize(5);

            var decision = Subject.IsSatisfiedBy(_remoteBook, null);

            decision.Accepted.Should().BeFalse();
            decision.Reason.Should().Contain(quality.Name);
        }

        [Test]
        public void should_accept_1mb_epub_release()
        {
            GivenQuality(Quality.EPUB);
            GivenSize(1);

            Subject.IsSatisfiedBy(_remoteBook, null).Accepted.Should().BeTrue();
        }

        [TestCaseSource(nameof(EbookQualities))]
        public void should_never_size_check_ebook_qualities(Quality quality)
        {
            GivenQuality(quality);
            GivenSize(0.1);

            Subject.IsSatisfiedBy(_remoteBook, null).Accepted.Should().BeTrue();
        }

        [TestCase(0)]
        [TestCase(-1)]
        public void should_accept_release_with_unknown_size(long size)
        {
            _remoteBook.Release.Size = size;

            Subject.IsSatisfiedBy(_remoteBook, null).Accepted.Should().BeTrue();
        }

        [Test]
        public void should_treat_zero_minimum_as_no_minimum()
        {
            _definitions[Quality.MP3].MinSize = 0;
            GivenSize(1);

            Subject.IsSatisfiedBy(_remoteBook, null).Accepted.Should().BeTrue();
        }

        [Test]
        public void should_treat_null_minimum_as_no_minimum()
        {
            _definitions[Quality.MP3].MinSize = null;
            GivenSize(1);

            Subject.IsSatisfiedBy(_remoteBook, null).Accepted.Should().BeTrue();
        }

        [TestCase(1262.2)]
        [TestCase(1309)]
        [TestCase(1)]
        public void should_not_reject_large_audiobook_on_old_max_size(double maxSize)
        {
            _definitions[Quality.MP3].MaxSize = maxSize;
            GivenSize(900);

            Subject.IsSatisfiedBy(_remoteBook, null).Accepted.Should().BeTrue();
        }

        [TestCaseSource(nameof(AudioQualities))]
        public void default_definition_should_reject_5mb_audio_release(Quality quality)
        {
            _definitions[quality] = Quality.DefaultQualityDefinitions.Single(d => d.Quality == quality);
            GivenQuality(quality);
            GivenSize(5);

            Subject.IsSatisfiedBy(_remoteBook, null).Accepted.Should().BeFalse();

            GivenSize(15);

            Subject.IsSatisfiedBy(_remoteBook, null).Accepted.Should().BeTrue();
        }

        [TestCaseSource(nameof(AudioQualities))]
        public void default_audio_definition_should_have_10mb_minimum_and_no_maximum(Quality quality)
        {
            var definition = Quality.DefaultQualityDefinitions.Single(d => d.Quality == quality);

            definition.MinSize.Should().Be(MegabytesInKilobits(10));
            definition.MaxSize.Should().BeNull();
        }
    }
}
