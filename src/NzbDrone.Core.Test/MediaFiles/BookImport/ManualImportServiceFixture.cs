using System.Collections.Generic;
using System.IO;
using System.IO.Abstractions;
using System.Linq;
using FizzWare.NBuilder;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Disk;
using NzbDrone.Core.Books;
using NzbDrone.Core.Download;
using NzbDrone.Core.Download.TrackedDownloads;
using NzbDrone.Core.MediaFiles;
using NzbDrone.Core.MediaFiles.BookImport;
using NzbDrone.Core.MediaFiles.BookImport.Manual;
using NzbDrone.Core.MediaFiles.Events;
using NzbDrone.Core.Messaging.Events;
using NzbDrone.Core.Parser.Model;
using NzbDrone.Core.Qualities;
using NzbDrone.Core.RootFolders;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.MediaFiles.BookImport
{
    [TestFixture]
    public class ManualImportServiceFixture : CoreTest<ManualImportService>
    {
        private const string DownloadId = "9ac1faac-ba20-42db-877c-ce27181de124";

        private string _folder;
        private Author _author;
        private Book _book;
        private TrackedDownload _trackedDownload;
        private List<ManualImportFile> _files;

        // Live case, The Autumn Republic on 2026-10-09: a script chose all 56 parts for a manual import, BMAR01 was
        // skipped as a duplicate part, and the download was still marked imported, so SABnzbd deleted BMAR01.
        [SetUp]
        public void Setup()
        {
            _folder = @"C:\Test\Downloads\Brian McClellan - The Autumn Republic - Book Three of the Powder Mage Trilogy (2015) MP3".AsOsAgnostic();
            _author = Builder<Author>.CreateNew().With(a => a.Path = @"C:\Test\Books\Brian McClellan".AsOsAgnostic()).Build();
            _book = new Book { Id = 40224712, ForeignBookId = "40224712", Title = "The Autumn Republic" };

            var item = new DownloadClientItem
            {
                DownloadId = DownloadId,
                Title = "Brian McClellan - The Autumn Republic - Book Three of the Powder Mage Trilogy (2015) MP3",
                CanMoveFiles = true,
                OutputPath = new OsPath(_folder)
            };

            _trackedDownload = new TrackedDownload
            {
                DownloadItem = item,
                ImportItem = item,
                RemoteBook = new RemoteBook { Author = _author, Books = new List<Book> { _book } },
                State = TrackedDownloadState.ImportPending
            };

            _files = Enumerable.Range(1, 56).Select(i => new ManualImportFile
            {
                Path = PartPath(i),
                AuthorId = _author.Id,
                BookId = _book.Id,
                ForeignEditionId = "9758412",
                Quality = new QualityModel(Quality.MP3),
                DownloadId = DownloadId
            }).ToList();

            Mocker.SetConstant<IPartsLeftBehindService>(Mocker.Resolve<PartsLeftBehindService>());

            Mocker.GetMock<IAuthorService>().Setup(s => s.GetAuthor(It.IsAny<int>())).Returns(_author);
            Mocker.GetMock<IBookService>().Setup(s => s.GetBook(It.IsAny<int>())).Returns(_book);
            Mocker.GetMock<IEditionService>().Setup(s => s.GetEditionByForeignEditionId(It.IsAny<string>())).Returns(new Edition { ForeignEditionId = "9758412" });
            Mocker.GetMock<IRootFolderService>().Setup(s => s.GetBestRootFolder(_author.Path)).Returns(new RootFolder());
            Mocker.GetMock<IDiskProvider>().Setup(s => s.GetFileInfo(It.IsAny<string>())).Returns(new Mock<IFileInfo>().Object);
            Mocker.GetMock<IMetadataTagService>().Setup(s => s.ReadTags(It.IsAny<IFileInfo>())).Returns(new ParsedTrackInfo());
            Mocker.GetMock<ITrackedDownloadService>().Setup(s => s.Find(DownloadId)).Returns(_trackedDownload);
        }

        private string PartPath(int number)
        {
            return Path.Combine(_folder, $"BMAR{number:00}-56 Brian McClellan - The Autumn Republic.mp3");
        }

        private void GivenPartsInLibrary(int count)
        {
            Mocker.GetMock<IMediaFileService>()
                .Setup(s => s.GetFilesByBook(_book.Id))
                .Returns(Enumerable.Range(1, count).Select(i => new BookFile { Part = i, Path = $"/books/The Autumn Republic ({i}).mp3" }).ToList());
        }

        private void GivenSkipped(string fileName)
        {
            Mocker.GetMock<IImportApprovedBooks>()
                .Setup(s => s.Import(It.IsAny<List<ImportDecision<LocalBook>>>(), It.IsAny<bool>(), It.IsAny<DownloadClientItem>(), It.IsAny<ImportMode>()))
                .Returns((List<ImportDecision<LocalBook>> decisions, bool replace, DownloadClientItem downloadItem, ImportMode mode) => decisions
                    .Select(d => fileName != null && d.Item.Path.Contains(fileName)
                        ? new ImportResult(d, "Book has already been imported")
                        : new ImportResult(d))
                    .ToList());
        }

        // BMAR01 is still in the download folder and wasn't chosen; identification matches it to the given book
        private void GivenBmar01LeftUnchosen(Book matchedTo)
        {
            _files.RemoveAt(0);

            var onDisk = Enumerable.Range(1, 56).Select(i =>
            {
                var file = new Mock<IFileInfo>();
                file.SetupGet(f => f.FullName).Returns(PartPath(i));
                return file.Object;
            }).ToArray();

            Mocker.GetMock<IDiskProvider>().Setup(s => s.FolderExists(_folder)).Returns(true);
            Mocker.GetMock<IDiskScanService>().Setup(s => s.GetBookFiles(_folder, It.IsAny<bool>())).Returns(onDisk);

            Mocker.GetMock<IMakeImportDecision>()
                .Setup(s => s.GetImportDecisions(It.IsAny<List<IFileInfo>>(), It.IsAny<IdentificationOverrides>(), It.IsAny<ImportDecisionMakerInfo>(), It.IsAny<ImportDecisionMakerConfig>()))
                .Returns((List<IFileInfo> files, IdentificationOverrides overrides, ImportDecisionMakerInfo info, ImportDecisionMakerConfig config) => files
                    .Select(f => new ImportDecision<LocalBook>(new LocalBook { Path = f.FullName, Author = _author, Book = matchedTo }))
                    .ToList());
        }

        [Test]
        public void should_not_mark_the_download_imported_when_a_chosen_part_was_left_behind()
        {
            GivenSkipped("BMAR01-56");
            GivenPartsInLibrary(55);

            Subject.Execute(new ManualImportCommand { Files = _files, ImportMode = ImportMode.Move });

            _trackedDownload.State.Should().Be(TrackedDownloadState.ImportFailed);
            _trackedDownload.Status.Should().Be(TrackedDownloadStatus.Warning);
            _trackedDownload.StatusMessages.Should().ContainSingle(m => m.Title == "BMAR01-56 Brian McClellan - The Autumn Republic.mp3");

            Mocker.GetMock<IEventAggregator>()
                .Verify(v => v.PublishEvent(It.IsAny<DownloadCompletedEvent>()), Times.Never());
            Mocker.GetMock<IEventAggregator>()
                .Verify(v => v.PublishEvent(It.IsAny<BookImportIncompleteEvent>()), Times.Once());

            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_mark_the_download_imported_when_every_chosen_part_imported()
        {
            GivenSkipped(null);
            GivenPartsInLibrary(56);

            Subject.Execute(new ManualImportCommand { Files = _files, ImportMode = ImportMode.Move });

            _trackedDownload.State.Should().Be(TrackedDownloadState.Imported);

            Mocker.GetMock<IEventAggregator>()
                .Verify(v => v.PublishEvent(It.IsAny<DownloadCompletedEvent>()), Times.Once());
        }

        [Test]
        public void should_not_mark_the_download_imported_when_a_part_of_the_book_was_not_chosen()
        {
            GivenSkipped(null);
            GivenPartsInLibrary(55);
            GivenBmar01LeftUnchosen(_book);

            Subject.Execute(new ManualImportCommand { Files = _files, ImportMode = ImportMode.Move });

            _trackedDownload.State.Should().NotBe(TrackedDownloadState.Imported);
            _trackedDownload.StatusMessages.Should().ContainSingle(m => m.Title == "BMAR01-56 Brian McClellan - The Autumn Republic.mp3");

            Mocker.GetMock<IEventAggregator>()
                .Verify(v => v.PublishEvent(It.IsAny<DownloadCompletedEvent>()), Times.Never());

            // Only the file that wasn't chosen is identified again
            Mocker.GetMock<IMakeImportDecision>()
                .Verify(v => v.GetImportDecisions(It.Is<List<IFileInfo>>(l => l.Count == 1 && l[0].FullName == PartPath(1)), It.IsAny<IdentificationOverrides>(), It.IsAny<ImportDecisionMakerInfo>(), It.IsAny<ImportDecisionMakerConfig>()), Times.Once());

            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_mark_the_download_imported_when_a_file_not_chosen_belongs_to_another_book()
        {
            GivenSkipped(null);
            GivenPartsInLibrary(55);
            GivenBmar01LeftUnchosen(new Book { Id = 1, ForeignBookId = "another book" });

            Subject.Execute(new ManualImportCommand { Files = _files, ImportMode = ImportMode.Move });

            _trackedDownload.State.Should().Be(TrackedDownloadState.Imported);
        }
    }
}
