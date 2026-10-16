using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
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

        // FileExists, MoveFile, link(2) and unlink against an in-memory disk. Like the real calls, a move or a link
        // onto an existing file fails.
        private void GivenDisk(Dictionary<string, string> disk)
        {
            var diskProvider = Mocker.GetMock<IDiskProvider>();

            diskProvider.Setup(c => c.FileExists(It.IsAny<string>()))
                .Returns<string>(p => disk.ContainsKey(p));

            diskProvider.Setup(c => c.MoveFile(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>()))
                .Callback<string, string, bool>((source, destination, overwrite) =>
                {
                    if (disk.ContainsKey(destination))
                    {
                        throw new IOException($"{destination} already exists");
                    }

                    disk[destination] = disk[source];
                    disk.Remove(source);
                });

            diskProvider.Setup(c => c.TryCreateHardLink(It.IsAny<string>(), It.IsAny<string>()))
                .Returns<string, string>((source, destination) =>
                {
                    if (disk.ContainsKey(destination))
                    {
                        return false;
                    }

                    disk[destination] = disk[source];
                    return true;
                });

            diskProvider.Setup(c => c.DeleteFile(It.IsAny<string>()))
                .Callback<string>(p => disk.Remove(p));
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
            GivenDisk(disk);

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
            GivenDisk(disk);

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
        public void should_use_a_separate_set_aside_folder_for_each_upgrade()
        {
            GivenSingleTrackWithSingleTrackFile();

            // Back to back, as concurrent imports would be, so a clock-based name repeats
            var folders = Enumerable.Range(0, 50)
                .Select(i => Path.GetDirectoryName(Subject.UpgradeBookFile(_trackFile, _localTrack).SetAsideFiles.Single().Path))
                .ToList();

            folders.Should().OnlyHaveUniqueItems();
        }

        [Test]
        public void should_never_delete_the_contents_of_a_set_aside_folder()
        {
            GivenSingleTrackWithSingleTrackFile();

            // Another import could move a file in between an emptiness check and the delete
            Mocker.GetMock<IDiskProvider>()
                .Setup(c => c.FolderEmpty(It.IsAny<string>()))
                .Returns(true);

            var result = Subject.UpgradeBookFile(_trackFile, _localTrack);
            Subject.RemoveSetAsideFiles(result.SetAsideFiles);

            Mocker.GetMock<IDiskProvider>().Verify(v => v.DeleteFolder(It.IsAny<string>(), It.IsAny<bool>()), Times.Never());
        }

        [Test]
        public void should_not_overwrite_a_file_that_lands_while_putting_the_old_one_back()
        {
            var original = Path.Combine(_rootPath, "Book", "Author - Book (1).mp3");
            var backup = Path.Combine(_rootPath, "Book", UpgradeMediaFileService.SetAsideFolderName, "op", "Author - Book (1).mp3");
            var disk = new Dictionary<string, string> { { backup, "old" }, { original, "new" } };

            // The new file lands after any existence check has already said the path is free
            Mocker.GetMock<IDiskProvider>()
                .Setup(c => c.FileExists(It.IsAny<string>()))
                .Returns(false);

            // A rename replaces whatever is at the destination, as rename(2) does
            Mocker.GetMock<IDiskProvider>()
                .Setup(c => c.MoveFile(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>()))
                .Callback<string, string, bool>((source, destination, overwrite) =>
                {
                    disk[destination] = disk[source];
                    disk.Remove(source);
                });

            // link(2) and an exclusive-create copy refuse an existing destination
            Mocker.GetMock<IDiskProvider>()
                .Setup(c => c.TryCreateHardLink(It.IsAny<string>(), It.IsAny<string>()))
                .Returns<string, string>((source, destination) =>
                {
                    if (disk.ContainsKey(destination))
                    {
                        return false;
                    }

                    disk[destination] = disk[source];
                    return true;
                });

            Mocker.GetMock<IDiskProvider>()
                .Setup(c => c.CopyFile(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>()))
                .Callback<string, string, bool>((source, destination, overwrite) =>
                {
                    if (disk.ContainsKey(destination))
                    {
                        throw new IOException($"{destination} already exists");
                    }

                    disk[destination] = disk[source];
                });

            Mocker.GetMock<IDiskProvider>()
                .Setup(c => c.DeleteFile(It.IsAny<string>()))
                .Callback<string>(p => disk.Remove(p));

            var kept = Subject.RestoreSetAsideFiles(new List<SetAsideBookFile> { new SetAsideBookFile { OriginalPath = original, Path = backup } });

            disk.Should().Contain(original, "new");
            disk.Should().Contain(backup, "old");
            kept.Should().HaveCount(1);

            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_keep_the_upgrade_when_writing_its_tags_fails()
        {
            GivenSingleTrackWithSingleTrackFile();

            Mocker.GetMock<IMetadataTagService>()
                .Setup(s => s.WriteTags(It.IsAny<BookFile>(), It.IsAny<bool>(), It.IsAny<bool>()))
                .Throws(new InvalidOperationException("Nullable object must have a value."));

            var result = Subject.UpgradeBookFile(_trackFile, _localTrack);

            result.OldFiles.Should().HaveCount(1);
            result.SetAsideFiles.Should().HaveCount(1);

            ExceptionVerification.ExpectedWarns(1);
        }

        private Dictionary<string, string> GivenAFileInTheWay(BookFile occupant)
        {
            _localTrack.Book = Builder<Book>.CreateNew().Build();

            Mocker.GetMock<IMediaFileService>()
                .Setup(s => s.GetFilesByBook(_localTrack.Book.Id))
                .Returns(new List<BookFile>());

            var sourcePath = @"C:\Test\Downloads\Defiance 6.m4b".AsOsAgnostic();
            var destination = Path.Combine(_rootPath, @"Defiance of the Fall 6\Defiance of the Fall 6.m4b");
            var disk = new Dictionary<string, string> { { sourcePath, "new" }, { destination, "other" } };
            _trackFile.Path = sourcePath;
            GivenDisk(disk);

            Mocker.GetMock<IMoveBookFiles>()
                .Setup(c => c.GetBookFilePath(It.IsAny<BookFile>(), It.IsAny<LocalBook>()))
                .Returns(destination);

            Mocker.GetMock<IMoveBookFiles>()
                .Setup(c => c.MoveBookFile(It.IsAny<BookFile>(), It.IsAny<LocalBook>()))
                .Returns<BookFile, LocalBook>((file, localBook) =>
                {
                    if (disk.ContainsKey(destination))
                    {
                        throw new DestinationAlreadyExistsException($"Destination {destination} already exists.");
                    }

                    disk[destination] = disk[file.Path];
                    disk.Remove(file.Path);
                    file.Path = destination;

                    return file;
                });

            if (occupant != null)
            {
                occupant.Path = destination;

                Mocker.GetMock<IMediaFileService>()
                    .Setup(s => s.GetFileWithPath(destination))
                    .Returns(occupant);
            }

            return disk;
        }

        [Test]
        public void should_fail_on_a_file_in_the_way_unless_asked_to_replace_it()
        {
            var occupant = new BookFile { Id = 7, EditionId = 4 };
            var disk = GivenAFileInTheWay(occupant);

            Assert.Throws<DestinationAlreadyExistsException>(() => Subject.UpgradeBookFile(_trackFile, _localTrack));

            disk.Should().Contain(occupant.Path, "other");
            Mocker.GetMock<IMediaFileService>().Verify(v => v.Delete(It.IsAny<BookFile>(), It.IsAny<DeleteMediaFileReason>()), Times.Never());
        }

        [Test]
        public void should_set_aside_a_file_in_the_way_when_asked_to_replace_it()
        {
            var occupant = new BookFile { Id = 7, EditionId = 4 };
            var disk = GivenAFileInTheWay(occupant);
            _localTrack.ReplaceDestination = true;

            var result = Subject.UpgradeBookFile(_trackFile, _localTrack);

            disk.Should().Contain(occupant.Path, "new");
            result.SetAsideFiles.Should().ContainSingle(f => f.OriginalPath == occupant.Path);
            disk.Should().Contain(result.SetAsideFiles[0].Path, "other");

            // Its row goes now, its file is recycled with the release's other set-aside files
            Mocker.GetMock<IMediaFileService>().Verify(v => v.Delete(occupant, DeleteMediaFileReason.Upgrade), Times.Once());
            Mocker.GetMock<IRecycleBinProvider>().Verify(v => v.DeleteFile(It.IsAny<string>(), It.IsAny<string>()), Times.Never());
            result.OldFiles.Should().BeEmpty();
        }

        [Test]
        public void should_set_aside_an_unmapped_file_in_the_way_when_asked_to_replace_it()
        {
            var disk = GivenAFileInTheWay(null);
            var destination = disk.Keys.Single(k => k.Contains("Defiance of the Fall 6"));
            _localTrack.ReplaceDestination = true;

            var result = Subject.UpgradeBookFile(_trackFile, _localTrack);

            disk.Should().Contain(destination, "new");
            result.SetAsideFiles.Should().ContainSingle(f => f.OriginalPath == destination);
            Mocker.GetMock<IMediaFileService>().Verify(v => v.Delete(It.IsAny<BookFile>(), It.IsAny<DeleteMediaFileReason>()), Times.Never());
        }

        [Test]
        public void should_put_a_file_in_the_way_back_when_the_move_fails()
        {
            var occupant = new BookFile { Id = 7, EditionId = 4 };
            var disk = GivenAFileInTheWay(occupant);
            _localTrack.ReplaceDestination = true;

            Mocker.GetMock<IMoveBookFiles>()
                .Setup(c => c.MoveBookFile(It.IsAny<BookFile>(), It.IsAny<LocalBook>()))
                .Throws(new IOException("There is not enough space on the disk."));

            Assert.Throws<IOException>(() => Subject.UpgradeBookFile(_trackFile, _localTrack));

            disk.Should().Contain(occupant.Path, "other");
            Mocker.GetMock<IMediaFileService>().Verify(v => v.Delete(It.IsAny<BookFile>(), It.IsAny<DeleteMediaFileReason>()), Times.Never());
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
