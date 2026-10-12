using System.IO;
using FizzWare.NBuilder;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Disk;
using NzbDrone.Common.Extensions;
using NzbDrone.Core.Books;
using NzbDrone.Core.Configuration;
using NzbDrone.Core.Exceptions;
using NzbDrone.Core.MediaFiles;
using NzbDrone.Core.MediaFiles.Events;
using NzbDrone.Core.RootFolders;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.MediaFiles.MediaFileDeletionService
{
    [TestFixture]
    public class DeleteTrackFileFixture : CoreTest<Core.MediaFiles.MediaFileDeletionService>
    {
        private static readonly string RootFolder = @"C:\Test\Music";
        private Author _author;
        private BookFile _trackFile;

        [SetUp]
        public void Setup()
        {
            _author = Builder<Author>.CreateNew()
                                     .With(s => s.Path = Path.Combine(RootFolder, "Author Name"))
                                     .Build();

            _trackFile = Builder<BookFile>.CreateNew()
                                               .With(f => f.Path = "/Author Name - Track01")
                                               .Build();

            Mocker.GetMock<IDiskProvider>()
                  .Setup(s => s.GetParentFolder(_author.Path))
                  .Returns(RootFolder);

            Mocker.GetMock<IDiskProvider>()
                  .Setup(s => s.GetParentFolder(_trackFile.Path))
                  .Returns(_author.Path);
        }

        private void GivenRootFolderExists()
        {
            Mocker.GetMock<IDiskProvider>()
                  .Setup(s => s.FolderExists(RootFolder))
                  .Returns(true);
        }

        private void GivenRootFolderHasFolders()
        {
            Mocker.GetMock<IDiskProvider>()
                  .Setup(s => s.GetDirectories(RootFolder))
                  .Returns(new[] { _author.Path });
        }

        private void GivenAuthorFolderExists()
        {
            Mocker.GetMock<IDiskProvider>()
                  .Setup(s => s.FolderExists(_author.Path))
                  .Returns(true);
        }

        private void GivenNonCalibreRootFolder()
        {
            Mocker.GetMock<IRootFolderService>()
                .Setup(x => x.GetBestRootFolder(It.IsAny<string>()))
                .Returns(new RootFolder());
        }

        [Test]
        public void should_throw_if_root_folder_does_not_exist()
        {
            Assert.Throws<NzbDroneClientException>(() => Subject.DeleteTrackFile(_author, _trackFile));
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_throw_if_root_folder_is_empty()
        {
            GivenRootFolderExists();
            Assert.Throws<NzbDroneClientException>(() => Subject.DeleteTrackFile(_author, _trackFile));
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_delete_from_db_if_author_folder_does_not_exist()
        {
            GivenRootFolderExists();
            GivenRootFolderHasFolders();

            Subject.DeleteTrackFile(_author, _trackFile);

            Mocker.GetMock<IMediaFileService>().Verify(v => v.Delete(_trackFile, DeleteMediaFileReason.Manual), Times.Once());
            Mocker.GetMock<IRecycleBinProvider>().Verify(v => v.DeleteFile(_trackFile.Path, It.IsAny<string>()), Times.Never());
        }

        [Test]
        public void should_delete_from_db_if_track_file_does_not_exist()
        {
            GivenRootFolderExists();
            GivenRootFolderHasFolders();
            GivenAuthorFolderExists();

            Subject.DeleteTrackFile(_author, _trackFile);

            Mocker.GetMock<IMediaFileService>().Verify(v => v.Delete(_trackFile, DeleteMediaFileReason.Manual), Times.Once());
            Mocker.GetMock<IRecycleBinProvider>().Verify(v => v.DeleteFile(_trackFile.Path, It.IsAny<string>()), Times.Never());
        }

        [Test]
        public void should_delete_from_disk_and_db_if_track_file_exists()
        {
            GivenNonCalibreRootFolder();
            GivenRootFolderExists();
            GivenRootFolderHasFolders();
            GivenAuthorFolderExists();

            Mocker.GetMock<IDiskProvider>()
                  .Setup(s => s.FileExists(_trackFile.Path))
                  .Returns(true);

            Subject.DeleteTrackFile(_author, _trackFile);

            Mocker.GetMock<IRecycleBinProvider>().Verify(v => v.DeleteFile(_trackFile.Path, "Author Name"), Times.Once());
            Mocker.GetMock<IMediaFileService>().Verify(v => v.Delete(_trackFile, DeleteMediaFileReason.Manual), Times.Once());
        }

        [Test]
        public void should_handle_error_deleting_track_file()
        {
            GivenNonCalibreRootFolder();
            GivenRootFolderExists();
            GivenRootFolderHasFolders();
            GivenAuthorFolderExists();

            Mocker.GetMock<IDiskProvider>()
                  .Setup(s => s.FileExists(_trackFile.Path))
                  .Returns(true);

            Mocker.GetMock<IRecycleBinProvider>()
                  .Setup(s => s.DeleteFile(_trackFile.Path, "Author Name"))
                  .Throws(new IOException());

            Assert.Throws<NzbDroneClientException>(() => Subject.DeleteTrackFile(_author, _trackFile));

            ExceptionVerification.ExpectedErrors(1);
            Mocker.GetMock<IRecycleBinProvider>().Verify(v => v.DeleteFile(_trackFile.Path, "Author Name"), Times.Once());
            Mocker.GetMock<IMediaFileService>().Verify(v => v.Delete(_trackFile, DeleteMediaFileReason.Manual), Times.Never());
        }

        [Test]
        public void should_not_throw_tidying_up_after_a_file_whose_folder_is_already_gone()
        {
            // A rescan drops files that are missing from disk, often because their folder was renamed or removed
            _trackFile.Path = Path.Combine(_author.Path, "Book Title", "Book Title.m4b");
            _trackFile.Author = _author;
            var bookFolder = _trackFile.Path.GetParentPath();

            Mocker.GetMock<IConfigService>()
                  .SetupGet(s => s.DeleteEmptyFolders)
                  .Returns(true);

            GivenAuthorFolderExists();

            Mocker.GetMock<IDiskProvider>()
                  .Setup(s => s.GetFiles(_author.Path, true))
                  .Returns(new[] { Path.Combine(_author.Path, "Other Book", "Other Book.m4b") });

            Mocker.GetMock<IDiskProvider>()
                  .Setup(s => s.GetFiles(bookFolder, true))
                  .Throws(new DirectoryNotFoundException());

            Subject.Handle(new BookFileDeletedEvent(_trackFile, DeleteMediaFileReason.MissingFromDisk));

            Mocker.GetMock<IDiskProvider>().Verify(v => v.RemoveEmptySubfolders(It.IsAny<string>()), Times.Never());
            Mocker.GetMock<IDiskProvider>().Verify(v => v.DeleteFolder(It.IsAny<string>(), It.IsAny<bool>()), Times.Never());
        }

        [Test]
        public void should_not_throw_tidying_up_after_a_file_whose_author_folder_is_already_gone()
        {
            _trackFile.Path = Path.Combine(_author.Path, "Book Title", "Book Title.m4b");
            _trackFile.Author = _author;

            Mocker.GetMock<IConfigService>()
                  .SetupGet(s => s.DeleteEmptyFolders)
                  .Returns(true);

            Mocker.GetMock<IDiskProvider>()
                  .Setup(s => s.GetFiles(It.IsAny<string>(), true))
                  .Throws(new DirectoryNotFoundException());

            Subject.Handle(new BookFileDeletedEvent(_trackFile, DeleteMediaFileReason.MissingFromDisk));

            Mocker.GetMock<IDiskProvider>().Verify(v => v.RemoveEmptySubfolders(It.IsAny<string>()), Times.Never());
            Mocker.GetMock<IDiskProvider>().Verify(v => v.DeleteFolder(It.IsAny<string>(), It.IsAny<bool>()), Times.Never());
        }

        [Test]
        public void should_not_throw_tidying_up_after_a_file_whose_book_is_gone()
        {
            // A row left behind by a deleted book still points at its edition, so its author no longer loads
            _trackFile.Path = Path.Combine(_author.Path, "Book Title", "Book Title.m4b");
            _trackFile.Author = (Author)null;

            Mocker.GetMock<IConfigService>()
                  .SetupGet(s => s.DeleteEmptyFolders)
                  .Returns(true);

            Subject.Handle(new BookFileDeletedEvent(_trackFile, DeleteMediaFileReason.Manual));

            Mocker.GetMock<IDiskProvider>().Verify(v => v.RemoveEmptySubfolders(It.IsAny<string>()), Times.Never());
            Mocker.GetMock<IDiskProvider>().Verify(v => v.DeleteFolder(It.IsAny<string>(), It.IsAny<bool>()), Times.Never());
        }
    }
}
