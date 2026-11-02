using System.Collections.Generic;
using System.Linq;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Core.Books;
using NzbDrone.Core.Books.Events;
using NzbDrone.Core.Download;
using NzbDrone.Core.Download.History;
using NzbDrone.Core.Download.TrackedDownloads;
using NzbDrone.Core.History;
using NzbDrone.Core.Indexers;
using NzbDrone.Core.Parser;
using NzbDrone.Core.Parser.Model;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.Download.TrackedDownloads
{
    [TestFixture]
    public class TrackedDownloadServiceFixture : CoreTest<TrackedDownloadService>
    {
        private void GivenDownloadHistory()
        {
            Mocker.GetMock<IHistoryService>()
                .Setup(s => s.FindByDownloadId(It.Is<string>(sr => sr == "35238")))
                .Returns(new List<EntityHistory>()
                {
                    new EntityHistory()
                    {
                         DownloadId = "35238",
                         SourceTitle = "Audio Author - Audio Book [2018 - FLAC]",
                         AuthorId = 5,
                         BookId = 4,
                    }
                });
        }

        [Test]
        public void should_track_downloads_using_the_source_title_if_it_cannot_be_found_using_the_download_title()
        {
            GivenDownloadHistory();

            var remoteBook = new RemoteBook
            {
                Author = new Author() { Id = 5 },
                Books = new List<Book> { new Book { Id = 4 } },
                ParsedBookInfo = new ParsedBookInfo()
                {
                    BookTitle = "Audio Book",
                    AuthorName = "Audio Author"
                }
            };

            Mocker.GetMock<IParsingService>()
                  .Setup(s => s.Map(It.Is<ParsedBookInfo>(i => i.BookTitle == "Audio Book" && i.AuthorName == "Audio Author"), It.IsAny<int>(), It.IsAny<IEnumerable<int>>()))
                  .Returns(remoteBook);

            var client = new DownloadClientDefinition()
            {
                Id = 1,
                Protocol = DownloadProtocol.Torrent
            };

            var item = new DownloadClientItem()
            {
                Title = "The torrent release folder",
                DownloadId = "35238",
                DownloadClientInfo = new DownloadClientItemClientInfo
                {
                    Protocol = client.Protocol,
                    Id = client.Id,
                    Name = client.Name
                }
            };

            var trackedDownload = Subject.TrackDownload(client, item);

            trackedDownload.Should().NotBeNull();
            trackedDownload.RemoteBook.Should().NotBeNull();
            trackedDownload.RemoteBook.Author.Should().NotBeNull();
            trackedDownload.RemoteBook.Author.Id.Should().Be(5);
            trackedDownload.RemoteBook.Books.First().Id.Should().Be(4);
        }

        [Test]
        public void should_unmap_tracked_download_if_book_deleted()
        {
            GivenDownloadHistory();

            var remoteBook = new RemoteBook
            {
                Author = new Author() { Id = 5 },
                Books = new List<Book> { new Book { Id = 4 } },
                ParsedBookInfo = new ParsedBookInfo()
                {
                    BookTitle = "Audio Book",
                    AuthorName = "Audio Author"
                }
            };

            Mocker.GetMock<IParsingService>()
                  .Setup(s => s.Map(It.Is<ParsedBookInfo>(i => i.BookTitle == "Audio Book" && i.AuthorName == "Audio Author"), It.IsAny<int>(), It.IsAny<IEnumerable<int>>()))
                  .Returns(remoteBook);

            var client = new DownloadClientDefinition()
            {
                Id = 1,
                Protocol = DownloadProtocol.Torrent
            };

            var item = new DownloadClientItem()
            {
                Title = "Audio Author - Audio Book [2018 - FLAC]",
                DownloadId = "35238",
                DownloadClientInfo = new DownloadClientItemClientInfo
                {
                    Protocol = client.Protocol,
                    Id = client.Id,
                    Name = client.Name
                }
            };

            // get a tracked download in place
            var trackedDownload = Subject.TrackDownload(client, item);
            Subject.GetTrackedDownloads().Should().HaveCount(1);

            // simulate deletion - book no longer maps
            Mocker.GetMock<IParsingService>()
                .Setup(s => s.Map(It.Is<ParsedBookInfo>(i => i.BookTitle == "Audio Book" && i.AuthorName == "Audio Author"), It.IsAny<int>(), It.IsAny<IEnumerable<int>>()))
                .Returns(default(RemoteBook));

            // handle deletion event
            Subject.Handle(new BookInfoRefreshedEvent(remoteBook.Author, new List<Book>(), new List<Book>(), remoteBook.Books));

            // verify download has null remote book
            var trackedDownloads = Subject.GetTrackedDownloads();
            trackedDownloads.Should().HaveCount(1);
            trackedDownloads.First().RemoteBook.Should().BeNull();
        }

        [Test]
        public void should_not_throw_when_processing_deleted_episodes()
        {
            GivenDownloadHistory();

            var remoteEpisode = new RemoteBook
            {
                Author = new Author() { Id = 5 },
                Books = new List<Book> { new Book { Id = 4 } },
                ParsedBookInfo = new ParsedBookInfo()
                {
                    BookTitle = "TV Series"
                }
            };

            Mocker.GetMock<IParsingService>()
                  .Setup(s => s.Map(It.IsAny<ParsedBookInfo>(), It.IsAny<int>(), It.IsAny<List<int>>()))
                  .Returns(default(RemoteBook));

            Mocker.GetMock<IHistoryService>()
                  .Setup(s => s.FindByDownloadId(It.IsAny<string>()))
                  .Returns(new List<EntityHistory>());

            var client = new DownloadClientDefinition()
            {
                Id = 1,
                Protocol = DownloadProtocol.Torrent
            };

            var item = new DownloadClientItem()
            {
                Title = "TV Series - S01E01",
                DownloadId = "12345",
                DownloadClientInfo = new DownloadClientItemClientInfo
                {
                    Id = 1,
                    Type = "Blackhole",
                    Name = "Blackhole Client",
                    Protocol = DownloadProtocol.Torrent
                }
            };

            Subject.TrackDownload(client, item);
            Subject.GetTrackedDownloads().Should().HaveCount(1);

            Mocker.GetMock<IParsingService>()
                  .Setup(s => s.Map(It.IsAny<ParsedBookInfo>(), It.IsAny<int>(), It.IsAny<List<int>>()))
                  .Returns(default(RemoteBook));

            Subject.Handle(new BookInfoRefreshedEvent(remoteEpisode.Author, new List<Book>(), new List<Book>(), remoteEpisode.Books));

            var trackedDownloads = Subject.GetTrackedDownloads();
            trackedDownloads.Should().HaveCount(1);
            trackedDownloads.First().RemoteBook.Should().BeNull();
        }

        [Test]
        public void should_not_throw_when_processing_deleted_series()
        {
            GivenDownloadHistory();

            var remoteEpisode = new RemoteBook
            {
                Author = new Author() { Id = 5 },
                Books = new List<Book> { new Book { Id = 4 } },
                ParsedBookInfo = new ParsedBookInfo()
                {
                    BookTitle = "TV Series",
                }
            };

            Mocker.GetMock<IParsingService>()
                  .Setup(s => s.Map(It.IsAny<ParsedBookInfo>(), It.IsAny<int>(), It.IsAny<List<int>>()))
                  .Returns(default(RemoteBook));

            Mocker.GetMock<IHistoryService>()
                  .Setup(s => s.FindByDownloadId(It.IsAny<string>()))
                  .Returns(new List<EntityHistory>());

            var client = new DownloadClientDefinition()
            {
                Id = 1,
                Protocol = DownloadProtocol.Torrent
            };

            var item = new DownloadClientItem()
            {
                Title = "TV Series - S01E01",
                DownloadId = "12345",
                DownloadClientInfo = new DownloadClientItemClientInfo
                {
                    Id = 1,
                    Type = "Blackhole",
                    Name = "Blackhole Client",
                    Protocol = DownloadProtocol.Torrent
                }
            };

            Subject.TrackDownload(client, item);
            Subject.GetTrackedDownloads().Should().HaveCount(1);

            Mocker.GetMock<IParsingService>()
                  .Setup(s => s.Map(It.IsAny<ParsedBookInfo>(), It.IsAny<int>(), It.IsAny<List<int>>()))
                  .Returns(default(RemoteBook));

            Subject.Handle(new AuthorDeletedEvent(remoteEpisode.Author, true, true));

            var trackedDownloads = Subject.GetTrackedDownloads();
            trackedDownloads.Should().HaveCount(1);
            trackedDownloads.First().RemoteBook.Should().BeNull();
        }

        [TestCase(DownloadHistoryEventType.DownloadImported)]
        [TestCase(DownloadHistoryEventType.DownloadFailed)]
        [TestCase(DownloadHistoryEventType.DownloadIgnored)]
        public void should_retrack_as_downloading_when_grabbed_again_after_finishing(DownloadHistoryEventType finishedEvent)
        {
            Mocker.GetMock<IHistoryService>()
                .Setup(s => s.FindByDownloadId(It.Is<string>(sr => sr == "35238")))
                .Returns(new List<EntityHistory>());

            Mocker.GetMock<IDownloadHistoryService>()
                .Setup(s => s.GetLatestDownloadHistoryItem(It.Is<string>(sr => sr == "35238")))
                .Returns(new DownloadHistory
                {
                    AuthorId = 5,
                    EventType = finishedEvent
                });

            var remoteBook = new RemoteBook
            {
                Author = new Author { Id = 5 },
                Books = new List<Book> { new Book { Id = 4 } },
                ParsedBookInfo = new ParsedBookInfo
                {
                    BookTitle = "Audio Book",
                    AuthorName = "Audio Author"
                }
            };

            var client = new DownloadClientDefinition
            {
                Id = 1,
                Protocol = DownloadProtocol.Torrent
            };

            var item = new DownloadClientItem
            {
                Title = "Audio Author - Audio Book [2018 - FLAC]",
                DownloadId = "35238",
                DownloadClientInfo = new DownloadClientItemClientInfo
                {
                    Protocol = client.Protocol,
                    Id = client.Id,
                    Name = client.Name
                }
            };

            var finished = Subject.TrackDownload(client, item);
            finished.State.Should().NotBe(TrackedDownloadState.Downloading);

            Subject.Handle(new BookGrabbedEvent(remoteBook) { DownloadId = "35238" });

            Mocker.GetMock<IDownloadHistoryService>()
                .Setup(s => s.GetLatestDownloadHistoryItem(It.Is<string>(sr => sr == "35238")))
                .Returns(new DownloadHistory
                {
                    AuthorId = 5,
                    EventType = DownloadHistoryEventType.DownloadGrabbed
                });

            var regrabbed = Subject.TrackDownload(client, item);
            regrabbed.State.Should().Be(TrackedDownloadState.Downloading);
        }

        [Test]
        public void should_keep_tracking_when_grabbed_event_has_no_download_id()
        {
            Mocker.GetMock<IHistoryService>()
                .Setup(s => s.FindByDownloadId(It.IsAny<string>()))
                .Returns(new List<EntityHistory>());

            Mocker.GetMock<IDownloadHistoryService>()
                .Setup(s => s.GetLatestDownloadHistoryItem(It.IsAny<string>()))
                .Returns(new DownloadHistory { EventType = DownloadHistoryEventType.DownloadImported });

            var client = new DownloadClientDefinition { Id = 1, Protocol = DownloadProtocol.Torrent };
            var item = new DownloadClientItem
            {
                Title = "Unparsable",
                DownloadId = "35238",
                DownloadClientInfo = new DownloadClientItemClientInfo { Protocol = client.Protocol, Id = client.Id }
            };

            Subject.TrackDownload(client, item);
            Subject.Handle(new BookGrabbedEvent(new RemoteBook()));

            Subject.Find("35238").State.Should().Be(TrackedDownloadState.Imported);
        }
    }
}
