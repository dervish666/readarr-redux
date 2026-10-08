using System.Collections.Generic;
using System.IO;
using FizzWare.NBuilder;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Disk;
using NzbDrone.Core.Books;
using NzbDrone.Core.Datastore;
using NzbDrone.Core.MediaFiles;
using NzbDrone.Core.Parser.Model;
using NzbDrone.Core.RootFolders;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.MediaFiles
{
    public class UpgradeMediaFileServiceFixture : CoreTest<UpgradeMediaFileService>
    {
        private BookFile _trackFile;
        private LocalBook _localTrack;
        private string _rootPath = @"C:\Test\Music\Author".AsOsAgnostic();

        [SetUp]
        public void Setup()
        {
            _localTrack = new LocalBook();
            _localTrack.Author = new Author
            {
                Path = _rootPath
            };

            _trackFile = Builder<BookFile>
                .CreateNew()
                .Build();

            Mocker.GetMock<IDiskProvider>()
                .Setup(c => c.FileExists(It.IsAny<string>()))
                .Returns(true);

            Mocker.GetMock<IDiskProvider>()
                .Setup(c => c.FolderExists(It.IsAny<string>()))
                .Returns(true);

            Mocker.GetMock<IDiskProvider>()
                 .Setup(c => c.GetParentFolder(It.IsAny<string>()))
                 .Returns<string>(c => Path.GetDirectoryName(c));

            Mocker.GetMock<IRootFolderService>()
                .Setup(c => c.GetBestRootFolder(It.IsAny<string>()))
                .Returns(new RootFolder());
        }

        private void GivenSingleTrackWithSingleTrackFile()
        {
            _localTrack.Book = Builder<Book>.CreateNew()
                .Build();

            Mocker.GetMock<IMediaFileService>()
                .Setup(s => s.GetFilesByBook(_localTrack.Book.Id))
                .Returns(new List<BookFile>
                {
                    new BookFile
                    {
                        Id = 1,
                        Path = Path.Combine(_rootPath, @"Season 01\30.rock.s01e01.avi"),
                    }
                });
        }

        [Test]
        public void should_delete_single_track_file_once()
        {
            GivenSingleTrackWithSingleTrackFile();

            var result = Subject.UpgradeBookFile(_trackFile, _localTrack);
            Subject.RemoveSetAsideFiles(result.SetAsideFiles);

            Mocker.GetMock<IRecycleBinProvider>().Verify(v => v.DeleteFile(It.IsAny<string>(), It.IsAny<string>()), Times.Once());
        }

        [Test]
        public void should_set_the_old_file_aside_until_the_caller_removes_it()
        {
            GivenSingleTrackWithSingleTrackFile();

            var result = Subject.UpgradeBookFile(_trackFile, _localTrack);

            result.SetAsideFiles.Should().HaveCount(1);
            result.SetAsideFiles[0].Path.Should().Contain(UpgradeMediaFileService.SetAsideFolderName);

            Mocker.GetMock<IDiskProvider>().Verify(v => v.MoveFile(Path.Combine(_rootPath, @"Season 01\30.rock.s01e01.avi"), result.SetAsideFiles[0].Path, false), Times.Once());
            Mocker.GetMock<IRecycleBinProvider>().Verify(v => v.DeleteFile(It.IsAny<string>(), It.IsAny<string>()), Times.Never());
        }

        [Test]
        public void should_delete_track_file_from_database()
        {
            GivenSingleTrackWithSingleTrackFile();

            Subject.UpgradeBookFile(_trackFile, _localTrack);

            Mocker.GetMock<IMediaFileService>().Verify(v => v.Delete(It.IsAny<BookFile>(), DeleteMediaFileReason.Upgrade), Times.Once());
        }

        [Test]
        public void should_delete_existing_file_fromdb_if_file_doesnt_exist()
        {
            GivenSingleTrackWithSingleTrackFile();

            Mocker.GetMock<IDiskProvider>()
                .Setup(c => c.FileExists(It.IsAny<string>()))
                .Returns(false);

            Subject.UpgradeBookFile(_trackFile, _localTrack);

            // Mocker.GetMock<IMediaFileService>().Verify(v => v.Delete(_localTrack.Book.BookFiles.Value, DeleteMediaFileReason.Upgrade), Times.Once());
        }

        [Test]
        public void should_not_try_to_recyclebin_existing_file_if_file_doesnt_exist()
        {
            GivenSingleTrackWithSingleTrackFile();

            Mocker.GetMock<IDiskProvider>()
                .Setup(c => c.FileExists(It.IsAny<string>()))
                .Returns(false);

            Subject.UpgradeBookFile(_trackFile, _localTrack);

            Mocker.GetMock<IRecycleBinProvider>().Verify(v => v.DeleteFile(It.IsAny<string>(), It.IsAny<string>()), Times.Never());
        }

        [Test]
        public void should_put_the_old_file_back_when_the_new_file_cannot_be_moved()
        {
            GivenSingleTrackWithSingleTrackFile();

            var oldPath = Path.Combine(_rootPath, @"Season 01\30.rock.s01e01.avi");
            var disk = new Dictionary<string, string> { { oldPath, "old" } };

            Mocker.GetMock<IDiskProvider>()
                .Setup(c => c.FileExists(It.IsAny<string>()))
                .Returns<string>(p => disk.ContainsKey(p));

            Mocker.GetMock<IDiskProvider>()
                .Setup(c => c.MoveFile(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>()))
                .Callback<string, string, bool>((source, destination, overwrite) =>
                {
                    disk[destination] = disk[source];
                    disk.Remove(source);
                });

            Mocker.GetMock<IRecycleBinProvider>()
                .Setup(c => c.DeleteFile(It.IsAny<string>(), It.IsAny<string>()))
                .Callback<string, string>((path, subfolder) => disk.Remove(path));

            Mocker.GetMock<IMoveBookFiles>()
                .Setup(c => c.MoveBookFile(It.IsAny<BookFile>(), It.IsAny<LocalBook>()))
                .Throws(new IOException("There is not enough space on the disk."));

            Assert.Throws<IOException>(() => Subject.UpgradeBookFile(_trackFile, _localTrack));

            disk.Should().Contain(oldPath, "old");

            Mocker.GetMock<IRecycleBinProvider>().Verify(v => v.DeleteFile(It.IsAny<string>(), It.IsAny<string>()), Times.Never());
            Mocker.GetMock<IMediaFileService>().Verify(v => v.Delete(It.IsAny<BookFile>(), It.IsAny<DeleteMediaFileReason>()), Times.Never());
        }

        [Test]
        public void should_undo_the_move_when_a_step_after_it_fails()
        {
            GivenSingleTrackWithSingleTrackFile();

            var oldPath = Path.Combine(_rootPath, @"Season 01\30.rock.s01e01.avi");
            var sourcePath = @"C:\Test\Downloads\new.avi".AsOsAgnostic();
            var disk = new Dictionary<string, string> { { oldPath, "old" }, { sourcePath, "new" } };
            _trackFile.Path = sourcePath;

            Mocker.GetMock<IDiskProvider>()
                .Setup(c => c.FileExists(It.IsAny<string>()))
                .Returns<string>(p => disk.ContainsKey(p));

            Mocker.GetMock<IDiskProvider>()
                .Setup(c => c.MoveFile(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>()))
                .Callback<string, string, bool>((source, destination, overwrite) =>
                {
                    if (disk.ContainsKey(destination))
                    {
                        throw new IOException($"{destination} already exists");
                    }

                    disk[destination] = disk[source];
                    disk.Remove(source);
                });

            // The file lands on the old path, then reading its date back off a flaky share fails
            Mocker.GetMock<IMoveBookFiles>()
                .Setup(c => c.MoveBookFile(It.IsAny<BookFile>(), It.IsAny<LocalBook>()))
                .Callback<BookFile, LocalBook>((file, localBook) =>
                {
                    disk[oldPath] = disk[file.Path];
                    disk.Remove(file.Path);
                    file.Path = oldPath;
                })
                .Throws(new IOException("Input/output error"));

            Assert.Throws<IOException>(() => Subject.UpgradeBookFile(_trackFile, _localTrack));

            disk.Should().Contain(sourcePath, "new");
            disk.Should().Contain(oldPath, "old");
            _trackFile.Path.Should().Be(sourcePath);

            Mocker.GetMock<IRecycleBinProvider>().Verify(v => v.DeleteFile(It.IsAny<string>(), It.IsAny<string>()), Times.Never());
        }

        [Test]
        public void should_return_old_track_file_in_oldFiles()
        {
            GivenSingleTrackWithSingleTrackFile();

            Subject.UpgradeBookFile(_trackFile, _localTrack).OldFiles.Count.Should().Be(1);
        }

        [Test]
        [Ignore("Pending readarr fix")]
        public void should_import_if_existing_file_doesnt_exist_in_db()
        {
            _localTrack.Book = Builder<Book>.CreateNew()
                .With(e => e.BookFiles = new LazyLoaded<List<BookFile>>())
                .Build();

            Subject.UpgradeBookFile(_trackFile, _localTrack);

            // Mocker.GetMock<IMediaFileService>().Verify(v => v.Delete(_localTrack.Book.BookFiles.Value, It.IsAny<DeleteMediaFileReason>()), Times.Never());
        }
    }
}
