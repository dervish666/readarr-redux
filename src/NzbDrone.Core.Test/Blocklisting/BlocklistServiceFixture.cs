using System;
using System.Collections.Generic;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Core.Blocklisting;
using NzbDrone.Core.Download;
using NzbDrone.Core.Indexers;
using NzbDrone.Core.Parser.Model;
using NzbDrone.Core.Qualities;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.Blocklisting
{
    [TestFixture]
    public class BlocklistServiceFixture : CoreTest<BlocklistService>
    {
        private const string NzbTitle = "Author Name - Book Title (2020) [EPUB]";
        private const long NzbSize = 1352581;

        private static readonly DateTime NzbPublishedDate = new DateTime(2026, 2, 6, 15, 39, 0, DateTimeKind.Utc);

        private DownloadFailedEvent _event;

        [SetUp]
        public void Setup()
        {
            _event = new DownloadFailedEvent
            {
                AuthorId = 12345,
                BookIds = new List<int> { 1 },
                Quality = new QualityModel(Quality.MP3),
                SourceTitle = "author.name.book.title",
                DownloadClient = "SabnzbdClient",
                DownloadId = "Sabnzbd_nzo_2dfh73k"
            };

            _event.Data.Add("publishedDate", DateTime.UtcNow.ToString("s") + "Z");
            _event.Data.Add("size", "1000");
            _event.Data.Add("indexer", "nzbs.org");
            _event.Data.Add("protocol", "1");
            _event.Data.Add("message", "Marked as failed");
        }

        [Test]
        public void should_add_to_repository()
        {
            Subject.Handle(_event);

            Mocker.GetMock<IBlocklistRepository>()
                .Verify(v => v.Insert(It.Is<Blocklist>(b => b.BookIds == _event.BookIds)), Times.Once());
        }

        [Test]
        public void should_add_to_repository_missing_size_and_protocol()
        {
            Subject.Handle(_event);

            _event.Data.Remove("size");
            _event.Data.Remove("protocol");

            Mocker.GetMock<IBlocklistRepository>()
                .Verify(v => v.Insert(It.Is<Blocklist>(b => b.BookIds == _event.BookIds)), Times.Once());
        }

        private void GivenBlocklistedNzb(string indexer, DateTime? publishedDate)
        {
            Mocker.GetMock<IBlocklistRepository>()
                .Setup(s => s.BlocklistedByTitle(12345, NzbTitle))
                .Returns(new List<Blocklist>
                {
                    new Blocklist
                    {
                        AuthorId = 12345,
                        SourceTitle = NzbTitle,
                        Indexer = indexer,
                        PublishedDate = publishedDate,
                        Size = NzbSize,
                        Protocol = DownloadProtocol.Usenet
                    }
                });
        }

        private static ReleaseInfo NzbRelease(string indexer, DateTime publishDate)
        {
            return new ReleaseInfo
            {
                Title = NzbTitle,
                Indexer = indexer,
                PublishDate = publishDate,
                Size = NzbSize,
                DownloadProtocol = DownloadProtocol.Usenet
            };
        }

        [TestCase(0)]
        [TestCase(-10)]
        public void should_not_block_nzb_from_another_indexer(int publishedOffsetSeconds)
        {
            GivenBlocklistedNzb("NZBgeek", NzbPublishedDate);

            Subject.Blocklisted(12345, NzbRelease("NZBFinder", NzbPublishedDate.AddSeconds(publishedOffsetSeconds))).Should().BeFalse();
        }

        [Test]
        public void should_block_nzb_from_same_indexer_with_identical_published_date()
        {
            GivenBlocklistedNzb("NZBgeek", NzbPublishedDate);

            Subject.Blocklisted(12345, NzbRelease("NZBgeek", NzbPublishedDate)).Should().BeTrue();
        }

        [Test]
        public void should_not_block_nzb_from_same_indexer_when_published_date_differs()
        {
            GivenBlocklistedNzb("NZBgeek", NzbPublishedDate);

            Subject.Blocklisted(12345, NzbRelease("NZBgeek", NzbPublishedDate.AddSeconds(-10))).Should().BeFalse();
        }

        [Test]
        public void should_not_block_nzb_when_blocklisted_item_has_no_published_date()
        {
            GivenBlocklistedNzb("NZBgeek", null);

            Subject.Blocklisted(12345, NzbRelease("NZBgeek", NzbPublishedDate)).Should().BeFalse();
        }

        [Test]
        public void should_block_nzb_when_blocklisted_item_has_no_indexer_and_identical_published_date()
        {
            GivenBlocklistedNzb(null, NzbPublishedDate);

            Subject.Blocklisted(12345, NzbRelease("NZBFinder", NzbPublishedDate)).Should().BeTrue();
        }

        [Test]
        public void should_not_block_nzb_when_blocklisted_item_has_no_indexer_and_published_date_differs()
        {
            GivenBlocklistedNzb(null, NzbPublishedDate);

            Subject.Blocklisted(12345, NzbRelease("NZBFinder", NzbPublishedDate.AddSeconds(-10))).Should().BeFalse();
        }
    }
}
