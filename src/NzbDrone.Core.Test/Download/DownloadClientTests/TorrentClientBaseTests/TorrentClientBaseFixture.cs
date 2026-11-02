using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Moq;
using NUnit.Framework;
using NzbDrone.Core.Blocklisting;
using NzbDrone.Core.Exceptions;
using NzbDrone.Core.Indexers;
using NzbDrone.Core.Indexers.Torznab;
using NzbDrone.Core.MediaFiles.TorrentInfo;
using NzbDrone.Core.Parser.Model;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.Download.DownloadClientTests.TorrentClientBaseTests
{
    [TestFixture]
    public class TorrentClientBaseFixture : DownloadClientFixtureBase<TestTorrentClient>
    {
        [SetUp]
        public void Setup()
        {
            Mocker.GetMock<ITorrentFileInfoReader>()
                  .Setup(s => s.GetHashFromTorrentFile(It.IsAny<byte[]>()))
                  .Returns("HASH");

            InitLogging();
        }

        private IIndexer CreateIndexer(bool rejectWhileGrabbing, params FailDownloads[] failDownloads)
        {
            var indexer = CreateIndexer();

            indexer.Definition = new IndexerDefinition
            {
                Settings = new TorznabSettings
                {
                    RejectTorrentFilesWithBlockedExtensionsWhileGrabbing = rejectWhileGrabbing,
                    FailDownloads = failDownloads.Select(f => (int)f).ToList()
                }
            };

            return indexer;
        }

        private void GivenTorrentFiles(params string[] fileNames)
        {
            Mocker.GetMock<ITorrentFileInfoReader>()
                  .Setup(s => s.GetFileNamesFromTorrentFile(It.IsAny<byte[]>()))
                  .Returns(new List<string>(fileNames));
        }

        [Test]
        public void should_blocklist_and_throw_when_torrent_contains_an_executable()
        {
            var remoteBook = CreateRemoteBook();
            var indexer = CreateIndexer(true, FailDownloads.Executables, FailDownloads.PotentiallyDangerous);

            GivenTorrentFiles("Author - Book Title/Book Title.epub.exe");

            Assert.ThrowsAsync<ReleaseBlockedException>(async () => await Subject.Download(remoteBook, indexer));

            Mocker.GetMock<IBlocklistService>()
                  .Verify(s => s.Block(remoteBook, It.Is<string>(m => m.Contains(".exe"))), Times.Once());

            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_throw_when_preferring_torrent_files_and_the_torrent_file_is_blocked()
        {
            // Without a magnet link to fall back to, swallowing the block would quietly return no download
            Subject.SetPreferTorrentFile(true);

            var remoteBook = CreateRemoteBook();
            remoteBook.Release = new TorrentInfo
            {
                Title = _title,
                DownloadUrl = _downloadUrl
            };

            GivenTorrentFiles("Book Title.lnk");

            Assert.ThrowsAsync<ReleaseBlockedException>(async () => await Subject.Download(remoteBook, CreateIndexer(true, FailDownloads.PotentiallyDangerous)));

            Mocker.GetMock<IBlocklistService>()
                  .Verify(s => s.Block(remoteBook, It.Is<string>(m => m.Contains("potentially dangerous"))), Times.Once());

            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public async Task should_not_blocklist_when_torrent_holds_only_books()
        {
            var remoteBook = CreateRemoteBook();

            GivenTorrentFiles("Book Title.epub", "Book Title.mobi", "Book Title.azw3", "Book Title.pdf", "Book Title.cbz", "Part 01.mp3", "Book Title.m4b", "cover.jpg");

            await Subject.Download(remoteBook, CreateIndexer(true, FailDownloads.Executables, FailDownloads.PotentiallyDangerous));

            Mocker.GetMock<IBlocklistService>()
                  .Verify(s => s.Block(It.IsAny<RemoteBook>(), It.IsAny<string>()), Times.Never());
        }

        [Test]
        public async Task should_not_blocklist_an_executable_when_only_dangerous_files_fail()
        {
            var remoteBook = CreateRemoteBook();

            GivenTorrentFiles("Book Title.epub", "setup.exe");

            await Subject.Download(remoteBook, CreateIndexer(true, FailDownloads.PotentiallyDangerous));

            Mocker.GetMock<IBlocklistService>()
                  .Verify(s => s.Block(It.IsAny<RemoteBook>(), It.IsAny<string>()), Times.Never());
        }

        [Test]
        public async Task should_not_check_torrent_files_when_downloading_magnet_link()
        {
            var remoteBook = CreateRemoteBook();
            remoteBook.Release.DownloadUrl = "magnet:?xt=urn:btih:c12fe1c06bba254a9dc9f519b335aa7c1367a88a";

            await Subject.Download(remoteBook, CreateIndexer(true, FailDownloads.Executables));

            Mocker.GetMock<ITorrentFileInfoReader>()
                  .Verify(s => s.GetFileNamesFromTorrentFile(It.IsAny<byte[]>()), Times.Never());
        }

        [Test]
        public async Task should_not_check_torrent_files_when_fail_downloads_is_empty()
        {
            await Subject.Download(CreateRemoteBook(), CreateIndexer(true));

            Mocker.GetMock<ITorrentFileInfoReader>()
                  .Verify(s => s.GetFileNamesFromTorrentFile(It.IsAny<byte[]>()), Times.Never());
        }

        [Test]
        public async Task should_not_check_torrent_files_when_reject_setting_is_disabled()
        {
            await Subject.Download(CreateRemoteBook(), CreateIndexer(false, FailDownloads.Executables));

            Mocker.GetMock<ITorrentFileInfoReader>()
                  .Verify(s => s.GetFileNamesFromTorrentFile(It.IsAny<byte[]>()), Times.Never());
        }
    }
}
