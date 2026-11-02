using System.IO;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Disk;
using NzbDrone.Common.EnvironmentInfo;
using NzbDrone.Common.Extensions;
using NzbDrone.Core.Datastore;
using NzbDrone.Core.Lifecycle;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.Datastore
{
    [TestFixture]
    public class DatabaseRestorationServiceFixture : CoreTest<DatabaseRestorationService>
    {
        private string _databasePath;
        private string _databaseRestorePath;

        [SetUp]
        public void Setup()
        {
            Mocker.GetMock<IAppFolderInfo>().SetupGet(c => c.AppDataFolder).Returns(@"C:\ProgramData\Readarr".AsOsAgnostic());

            _databasePath = Mocker.GetMock<IAppFolderInfo>().Object.GetDatabase();
            _databaseRestorePath = Mocker.GetMock<IAppFolderInfo>().Object.GetDatabaseRestore();
        }

        private void GivenFileExists(string path)
        {
            Mocker.GetMock<IDiskProvider>()
                  .Setup(s => s.FileExists(path))
                  .Returns(true);
        }

        [Test]
        public void should_do_nothing_if_there_is_no_database_to_restore()
        {
            GivenFileExists(_databasePath);

            Subject.Restore();

            Mocker.GetMock<IDiskProvider>().Verify(v => v.MoveFile(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>()), Times.Never());
            Mocker.GetMock<IDiskProvider>().Verify(v => v.DeleteFile(It.IsAny<string>()), Times.Never());
        }

        [Test]
        public void should_keep_current_database_as_pre_restore()
        {
            GivenFileExists(_databaseRestorePath);
            GivenFileExists(_databasePath);
            GivenFileExists(_databasePath + "-wal");

            Subject.Restore();

            Mocker.GetMock<IDiskProvider>().Verify(v => v.MoveFile(_databasePath, _databasePath + ".pre-restore", false), Times.Once());
            Mocker.GetMock<IDiskProvider>().Verify(v => v.MoveFile(_databasePath + "-wal", _databasePath + ".pre-restore-wal", false), Times.Once());
            Mocker.GetMock<IDiskProvider>().Verify(v => v.MoveFile(_databaseRestorePath, _databasePath, false), Times.Once());
            Mocker.GetMock<IDiskProvider>().Verify(v => v.DeleteFile(_databasePath), Times.Never());
            Mocker.GetMock<IDiskProvider>().Verify(v => v.DeleteFile(_databasePath + "-wal"), Times.Never());
        }

        [Test]
        public void should_return_false_if_there_is_no_database_to_restore()
        {
            Subject.Restore().Should().BeFalse();
        }

        [Test]
        public void should_return_true_after_restoring()
        {
            GivenFileExists(_databaseRestorePath);
            GivenFileExists(_databasePath);

            Subject.Restore().Should().BeTrue();
        }

        [Test]
        public void should_keep_existing_pre_restore_database_when_an_earlier_restore_never_started()
        {
            GivenFileExists(_databaseRestorePath);
            GivenFileExists(_databasePath);
            GivenFileExists(_databasePath + "-wal");
            GivenFileExists(_databasePath + ".pre-restore");

            Subject.Restore();

            ExceptionVerification.ExpectedWarns(1);

            Mocker.GetMock<IDiskProvider>().Verify(v => v.DeleteFile(It.Is<string>(p => p.StartsWith(_databasePath + ".pre-restore"))), Times.Never());
            Mocker.GetMock<IDiskProvider>().Verify(v => v.MoveFile(It.IsAny<string>(), It.Is<string>(p => p.StartsWith(_databasePath + ".pre-restore")), It.IsAny<bool>()), Times.Never());
            Mocker.GetMock<IDiskProvider>().Verify(v => v.MoveFile(_databasePath, _databasePath + ".restore-failed", false), Times.Once());
            Mocker.GetMock<IDiskProvider>().Verify(v => v.MoveFile(_databasePath + "-wal", _databasePath + ".restore-failed-wal", false), Times.Once());
            Mocker.GetMock<IDiskProvider>().Verify(v => v.MoveFile(_databaseRestorePath, _databasePath, false), Times.Once());
        }

        [Test]
        public void should_put_pre_restore_database_back_on_roll_back()
        {
            GivenFileExists(_databasePath);
            GivenFileExists(_databasePath + "-wal");
            GivenFileExists(_databasePath + ".pre-restore");

            Subject.RollBack();

            ExceptionVerification.ExpectedErrors(1);

            Mocker.GetMock<IDiskProvider>().Verify(v => v.MoveFile(_databasePath, _databasePath + ".restore-failed", false), Times.Once());
            Mocker.GetMock<IDiskProvider>().Verify(v => v.MoveFile(_databasePath + "-wal", _databasePath + ".restore-failed-wal", false), Times.Once());
            Mocker.GetMock<IDiskProvider>().Verify(v => v.MoveFile(_databasePath + ".pre-restore", _databasePath, false), Times.Once());
            Mocker.GetMock<IDiskProvider>().Verify(v => v.DeleteFile(It.Is<string>(p => p.StartsWith(_databasePath + ".pre-restore"))), Times.Never());
        }

        [Test]
        public void should_not_move_restored_database_aside_on_roll_back_without_a_pre_restore_database()
        {
            GivenFileExists(_databasePath);

            Subject.RollBack();

            ExceptionVerification.ExpectedErrors(1);

            Mocker.GetMock<IDiskProvider>().Verify(v => v.MoveFile(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>()), Times.Never());
        }

        [Test]
        public void should_move_database_back_if_restore_fails()
        {
            GivenFileExists(_databaseRestorePath);
            GivenFileExists(_databasePath);
            GivenFileExists(_databasePath + "-wal");

            Mocker.GetMock<IDiskProvider>()
                  .Setup(s => s.MoveFile(_databasePath + "-wal", _databasePath + ".pre-restore-wal", false))
                  .Throws(new IOException());

            Assert.Throws<IOException>(() => Subject.Restore());

            ExceptionVerification.ExpectedErrors(1);

            Mocker.GetMock<IDiskProvider>().Verify(v => v.MoveFile(_databasePath + ".pre-restore", _databasePath, true), Times.Once());
            Mocker.GetMock<IDiskProvider>().Verify(v => v.MoveFile(_databasePath + ".pre-restore-wal", _databasePath + "-wal", true), Times.Never());
            Mocker.GetMock<IDiskProvider>().Verify(v => v.MoveFile(_databaseRestorePath, _databasePath, It.IsAny<bool>()), Times.Never());
        }

        [Test]
        public void should_delete_pre_restore_database_after_startup()
        {
            Subject.HandleAsync(new ApplicationStartedEvent());

            Mocker.GetMock<IDiskProvider>().Verify(v => v.DeleteFile(_databasePath + ".pre-restore"), Times.Once());
            Mocker.GetMock<IDiskProvider>().Verify(v => v.DeleteFile(_databasePath + ".pre-restore-wal"), Times.Once());
            Mocker.GetMock<IDiskProvider>().Verify(v => v.DeleteFile(_databasePath), Times.Never());
        }
    }
}
