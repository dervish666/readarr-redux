using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Abstractions;
using System.IO.Abstractions.TestingHelpers;
using FizzWare.NBuilder;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Disk;
using NzbDrone.Core.Books;
using NzbDrone.Core.Download;
using NzbDrone.Core.Download.TrackedDownloads;
using NzbDrone.Core.MediaFiles;
using NzbDrone.Core.MediaFiles.BookImport;
using NzbDrone.Core.MediaFiles.Commands;
using NzbDrone.Core.Parser.Model;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.MediaFiles
{
    [TestFixture]
    public class DownloadedBooksCommandServiceFixture : FileSystemTest<DownloadedBooksCommandService>
    {
        private string _downloadFolder = "c:\\drop_other\\Show.S01E01\\".AsOsAgnostic();
        private string _downloadFile = "c:\\drop_other\\Show.S01E01.mkv".AsOsAgnostic();

        private TrackedDownload _trackedDownload;

        [SetUp]
        public void Setup()
        {
            Mocker.GetMock<IDownloadedBooksImportService>()
                .Setup(v => v.ProcessRootFolder(It.IsAny<IDirectoryInfo>()))
                .Returns(new List<ImportResult>());

            Mocker.GetMock<IDownloadedBooksImportService>()
                .Setup(v => v.ProcessPath(It.IsAny<string>(), It.IsAny<ImportMode>(), It.IsAny<Author>(), It.IsAny<DownloadClientItem>(), It.IsAny<Book>(), It.IsAny<DownloadImportOptions>()))
                .Returns(new List<ImportResult>());

            var downloadItem = Builder<DownloadClientItem>.CreateNew()
                .With(v => v.DownloadId = "sab1")
                .With(v => v.Status = DownloadItemStatus.Downloading)
                .Build();

            var remoteBook = Builder<RemoteBook>.CreateNew()
                .With(v => v.Author = new Author())
                .Build();

            _trackedDownload = new TrackedDownload
            {
                DownloadItem = downloadItem,
                RemoteBook = remoteBook,
                State = TrackedDownloadState.Downloading
            };
        }

        private void GivenExistingFolder(string path)
        {
            FileSystem.AddDirectory(path);
        }

        private void GivenExistingFile(string path)
        {
            FileSystem.AddFile(path, new MockFileData(string.Empty));
        }

        private void GivenValidQueueItem()
        {
            Mocker.GetMock<ITrackedDownloadService>()
                  .Setup(s => s.Find("sab1"))
                  .Returns(_trackedDownload);
        }

        [Test]
        public void should_skip_import_if_dronefactory_doesnt_exist()
        {
            Assert.Throws<ArgumentException>(() => Subject.Execute(new DownloadedBooksScanCommand()));

            Mocker.GetMock<IDownloadedBooksImportService>().Verify(c => c.ProcessRootFolder(It.IsAny<IDirectoryInfo>()), Times.Never());
        }

        [Test]
        public void should_process_folder_if_downloadclientid_is_not_specified()
        {
            GivenExistingFolder(_downloadFolder);

            Subject.Execute(new DownloadedBooksScanCommand() { Path = _downloadFolder });

            Mocker.GetMock<IDownloadedBooksImportService>().Verify(c => c.ProcessPath(It.IsAny<string>(), ImportMode.Auto, null, null, null, It.IsAny<DownloadImportOptions>()), Times.Once());
        }

        [Test]
        public void should_process_file_if_downloadclientid_is_not_specified()
        {
            GivenExistingFile(_downloadFile);

            Subject.Execute(new DownloadedBooksScanCommand() { Path = _downloadFile });

            Mocker.GetMock<IDownloadedBooksImportService>().Verify(c => c.ProcessPath(It.IsAny<string>(), ImportMode.Auto, null, null, null, It.IsAny<DownloadImportOptions>()), Times.Once());
        }

        [Test]
        public void should_process_folder_with_downloadclientitem_if_available()
        {
            GivenExistingFolder(_downloadFolder);
            GivenValidQueueItem();

            Subject.Execute(new DownloadedBooksScanCommand() { Path = _downloadFolder, DownloadClientId = "sab1" });

            Mocker.GetMock<IDownloadedBooksImportService>().Verify(c => c.ProcessPath(_downloadFolder, ImportMode.Auto, _trackedDownload.RemoteBook.Author, _trackedDownload.DownloadItem, It.IsAny<Book>(), It.IsAny<DownloadImportOptions>()), Times.Once());
        }

        // A scan of CD1 alone must not stand in for the whole download, which also holds CD2
        [Test]
        public void should_verify_the_whole_download_path_when_the_scan_covers_part_of_it()
        {
            var downloadRoot = Path.Combine(_downloadFolder, "The Autumn Republic");
            var cd1 = Path.Combine(downloadRoot, "CD1");
            GivenExistingFolder(cd1);
            GivenValidQueueItem();

            _trackedDownload.DownloadItem.OutputPath = new OsPath(downloadRoot);

            Subject.Execute(new DownloadedBooksScanCommand() { Path = cd1, DownloadClientId = "sab1" });

            Mocker.GetMock<ICompletedDownloadService>()
                  .Verify(v => v.VerifyImport(_trackedDownload, It.IsAny<List<ImportResult>>(), downloadRoot), Times.Once());

            Mocker.GetMock<ICompletedDownloadService>()
                  .Verify(v => v.VerifyImport(It.IsAny<TrackedDownload>(), It.IsAny<List<ImportResult>>(), cd1), Times.Never());
        }

        [Test]
        public void should_pin_the_book_from_grab_history_not_the_parsed_title()
        {
            GivenExistingFolder(_downloadFolder);
            GivenValidQueueItem();

            var ruins = new Book { Id = 57560, Title = "Ruins" };
            _trackedDownload.RemoteBook.Books = new List<Book> { new Book { Id = 57546, Title = "Pathfinder" } };

            Mocker.GetMock<ICompletedDownloadService>()
                  .Setup(s => s.GetGrabbedBook(_trackedDownload))
                  .Returns(ruins);

            Subject.Execute(new DownloadedBooksScanCommand() { Path = _downloadFolder, DownloadClientId = "sab1" });

            Mocker.GetMock<IDownloadedBooksImportService>().Verify(c => c.ProcessPath(_downloadFolder, ImportMode.Auto, _trackedDownload.RemoteBook.Author, _trackedDownload.DownloadItem, ruins, It.IsAny<DownloadImportOptions>()), Times.Once());
        }

        [Test]
        public void should_not_import_when_the_grabbed_book_is_gone()
        {
            GivenExistingFolder(_downloadFolder);
            GivenValidQueueItem();

            Mocker.GetMock<ICompletedDownloadService>()
                  .Setup(s => s.GetGrabbedBook(_trackedDownload))
                  .Throws(new GrabbedBookNotFoundException("The book this download was grabbed for (id 57560) no longer exists, manual import required"));

            Subject.Execute(new DownloadedBooksScanCommand() { Path = _downloadFolder, DownloadClientId = "sab1" });

            Mocker.GetMock<IDownloadedBooksImportService>().Verify(c => c.ProcessPath(It.IsAny<string>(), It.IsAny<ImportMode>(), It.IsAny<Author>(), It.IsAny<DownloadClientItem>(), It.IsAny<Book>(), It.IsAny<DownloadImportOptions>()), Times.Never());

            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_identify_normally_when_the_download_has_no_known_author()
        {
            GivenExistingFolder(_downloadFolder);
            GivenValidQueueItem();

            _trackedDownload.RemoteBook = null;

            Subject.Execute(new DownloadedBooksScanCommand() { Path = _downloadFolder, DownloadClientId = "sab1" });

            Mocker.GetMock<IDownloadedBooksImportService>().Verify(c => c.ProcessPath(_downloadFolder, ImportMode.Auto, null, _trackedDownload.DownloadItem, It.IsAny<Book>(), It.IsAny<DownloadImportOptions>()), Times.Once());
        }

        [Test]
        public void should_process_folder_without_downloadclientitem_if_not_available()
        {
            GivenExistingFolder(_downloadFolder);

            Subject.Execute(new DownloadedBooksScanCommand() { Path = _downloadFolder, DownloadClientId = "sab1" });

            Mocker.GetMock<IDownloadedBooksImportService>().Verify(c => c.ProcessPath(_downloadFolder, ImportMode.Auto, null, null, null, It.IsAny<DownloadImportOptions>()), Times.Once());

            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_warn_if_neither_folder_or_file_exists()
        {
            Subject.Execute(new DownloadedBooksScanCommand() { Path = _downloadFolder });

            Mocker.GetMock<IDownloadedBooksImportService>().Verify(c => c.ProcessPath(It.IsAny<string>(), ImportMode.Auto, null, null, null, It.IsAny<DownloadImportOptions>()), Times.Never());

            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_override_import_mode()
        {
            GivenExistingFile(_downloadFile);

            Subject.Execute(new DownloadedBooksScanCommand() { Path = _downloadFile, ImportMode = ImportMode.Copy });

            Mocker.GetMock<IDownloadedBooksImportService>().Verify(c => c.ProcessPath(It.IsAny<string>(), ImportMode.Copy, null, null, null, It.IsAny<DownloadImportOptions>()), Times.Once());
        }
    }
}
