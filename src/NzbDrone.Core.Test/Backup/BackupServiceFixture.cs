using System.IO;
using System.Text;
using FluentAssertions;
using ICSharpCode.SharpZipLib.Zip;
using Moq;
using NUnit.Framework;
using NzbDrone.Common;
using NzbDrone.Common.Disk;
using NzbDrone.Common.EnvironmentInfo;
using NzbDrone.Common.Extensions;
using NzbDrone.Core.Backup;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.Backup
{
    [TestFixture]
    public class BackupServiceFixture : CoreTest<BackupService>
    {
        private const string ValidConfig = "<Config><Port>8787</Port></Config>";
        private const string ValidDatabase = "SQLite format 3\0                                                                                    ";

        private string _restoreFolder;
        private string _configPath;
        private string _databaseRestorePath;

        [SetUp]
        public void Setup()
        {
            _restoreFolder = Path.Combine(TempFolder, "readarr_backup_restore");

            Mocker.SetConstant<IArchiveService>(Mocker.Resolve<ArchiveService>());

            Mocker.GetMock<IAppFolderInfo>()
                .SetupGet(s => s.TempFolder)
                .Returns(TempFolder);

            Mocker.GetMock<IAppFolderInfo>()
                .SetupGet(s => s.AppDataFolder)
                .Returns(Path.Combine(TempFolder, "appdata"));

            _configPath = Mocker.GetMock<IAppFolderInfo>().Object.GetConfigPath();
            _databaseRestorePath = Mocker.GetMock<IAppFolderInfo>().Object.GetDatabaseRestore();

            Mocker.GetMock<IDiskProvider>()
                .Setup(s => s.GetFiles(It.IsAny<string>(), false))
                .Returns<string, bool>((path, recursive) => Directory.GetFiles(path));

            Mocker.GetMock<IDiskProvider>()
                .Setup(s => s.FolderExists(It.IsAny<string>()))
                .Returns<string>(Directory.Exists);

            Mocker.GetMock<IDiskProvider>()
                .Setup(s => s.DeleteFolder(It.IsAny<string>(), true))
                .Callback<string, bool>((path, recursive) => Directory.Delete(path, recursive));

            Mocker.GetMock<IDiskProvider>()
                .Setup(s => s.OpenReadStream(It.IsAny<string>()))
                .Returns<string>(path => new FileStream(path, FileMode.Open, FileAccess.Read));
        }

        private string CreateBackup(params string[] entryNames)
        {
            var path = Path.Combine(TempFolder, "readarr_backup.zip");

            using (var zip = new ZipOutputStream(File.Create(path)))
            {
                zip.NameTransform = null;

                foreach (var name in entryNames)
                {
                    var contents = name.EndsWith("config.xml") ? ValidConfig :
                                   name.EndsWith("readarr.db") ? ValidDatabase :
                                   name;
                    var data = Encoding.ASCII.GetBytes(contents);

                    zip.PutNextEntry(new ZipEntry(name));
                    zip.Write(data, 0, data.Length);
                    zip.CloseEntry();
                }
            }

            return path;
        }

        private string CreateBackupWith(string configContents, string databaseContents)
        {
            var path = Path.Combine(TempFolder, "readarr_backup.zip");

            using (var zip = new ZipOutputStream(File.Create(path)))
            {
                zip.NameTransform = null;

                if (configContents != null)
                {
                    AddEntry(zip, "config.xml", configContents);
                }

                if (databaseContents != null)
                {
                    AddEntry(zip, "readarr.db", databaseContents);
                }
            }

            return path;
        }

        private static void AddEntry(ZipOutputStream zip, string name, string contents)
        {
            var data = Encoding.ASCII.GetBytes(contents);

            zip.PutNextEntry(new ZipEntry(name));
            zip.Write(data, 0, data.Length);
            zip.CloseEntry();
        }

        private string GivenFile(string fileName, string contents)
        {
            Directory.CreateDirectory(TempFolder);

            var path = Path.Combine(TempFolder, fileName);
            File.WriteAllText(path, contents, Encoding.ASCII);

            return path;
        }

        private void VerifyNothingRestored()
        {
            Mocker.GetMock<IDiskProvider>()
                .Verify(v => v.MoveFile(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>()), Times.Never());
        }

        [Test]
        public void restore_should_only_extract_root_config_and_database()
        {
            var backup = CreateBackup("config.xml", "readarr.db", "INFO", "nested/readarr.db", "other.txt");

            Subject.Restore(backup);

            Mocker.GetMock<IDiskProvider>()
                .Verify(v => v.MoveFile(Path.Combine(_restoreFolder, "config.xml"), _configPath, true), Times.Once());

            Mocker.GetMock<IDiskProvider>()
                .Verify(v => v.MoveFile(Path.Combine(_restoreFolder, "readarr.db"), _databaseRestorePath, true), Times.Once());

            Mocker.GetMock<IDiskProvider>()
                .Verify(v => v.MoveFile(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>()), Times.Exactly(2));
        }

        [Test]
        public void restore_should_write_nothing_when_an_entry_escapes_restore_folder()
        {
            var backup = CreateBackup("config.xml", "readarr.db", "../evil.txt");

            Assert.Throws<IOException>(() => Subject.Restore(backup));

            File.Exists(Path.Combine(TempFolder, "evil.txt")).Should().BeFalse();
            Directory.Exists(_restoreFolder).Should().BeFalse();

            VerifyNothingRestored();
        }

        [Test]
        public void restore_should_remove_extracted_files_afterwards()
        {
            Subject.Restore(CreateBackup("config.xml", "readarr.db"));

            Directory.Exists(_restoreFolder).Should().BeFalse();
        }

        [Test]
        public void restore_should_ignore_files_left_from_an_earlier_attempt()
        {
            Directory.CreateDirectory(_restoreFolder);
            File.WriteAllText(Path.Combine(_restoreFolder, "readarr.db"), ValidDatabase, Encoding.ASCII);

            Subject.Restore(CreateBackup("config.xml"));

            Mocker.GetMock<IDiskProvider>()
                .Verify(v => v.MoveFile(It.IsAny<string>(), _databaseRestorePath, It.IsAny<bool>()), Times.Never());

            Mocker.GetMock<IDiskProvider>()
                .Verify(v => v.MoveFile(Path.Combine(_restoreFolder, "config.xml"), _configPath, true), Times.Once());
        }

        [Test]
        public void restore_should_not_restore_database_from_zip_that_is_not_sqlite()
        {
            var backup = CreateBackupWith(null, ValidConfig);

            Assert.Throws<RestoreBackupFailedException>(() => Subject.Restore(backup));

            VerifyNothingRestored();
        }

        [Test]
        public void restore_should_not_restore_config_from_zip_when_database_is_not_sqlite()
        {
            var backup = CreateBackupWith(ValidConfig, "not a database");

            Assert.Throws<RestoreBackupFailedException>(() => Subject.Restore(backup));

            VerifyNothingRestored();
        }

        [Test]
        public void restore_should_not_restore_database_from_zip_when_config_is_invalid()
        {
            var backup = CreateBackupWith("not xml", ValidDatabase);

            Assert.Throws<RestoreBackupFailedException>(() => Subject.Restore(backup));

            VerifyNothingRestored();
        }

        [Test]
        public void restore_should_remove_extracted_files_when_restore_fails()
        {
            var backup = CreateBackupWith(ValidConfig, "not a database");

            Assert.Throws<RestoreBackupFailedException>(() => Subject.Restore(backup));

            Directory.Exists(_restoreFolder).Should().BeFalse();
        }

        [Test]
        public void restore_should_fail_when_zip_has_neither_config_nor_database()
        {
            Assert.Throws<RestoreBackupFailedException>(() => Subject.Restore(CreateBackup("INFO")));

            VerifyNothingRestored();
        }

        [Test]
        public void restore_should_restore_uploaded_xml_as_config()
        {
            var path = GivenFile("readarr_backup_restore.xml", ValidConfig);

            Subject.Restore(path);

            Mocker.GetMock<IDiskProvider>().Verify(v => v.MoveFile(path, _configPath, true), Times.Once());
            Mocker.GetMock<IDiskProvider>().Verify(v => v.MoveFile(It.IsAny<string>(), _databaseRestorePath, It.IsAny<bool>()), Times.Never());
        }

        [TestCase("<Config><Port>8787")]
        [TestCase("<Settings><Port>8787</Port></Settings>")]
        [TestCase("SQLite format 3")]
        public void restore_should_not_restore_uploaded_xml_that_is_not_a_config_file(string contents)
        {
            var path = GivenFile("readarr_backup_restore.xml", contents);

            Assert.Throws<RestoreBackupFailedException>(() => Subject.Restore(path));

            VerifyNothingRestored();
        }

        [Test]
        public void restore_should_restore_uploaded_sqlite_database()
        {
            var path = GivenFile("readarr_backup_restore.db", ValidDatabase);

            Subject.Restore(path);

            Mocker.GetMock<IDiskProvider>().Verify(v => v.MoveFile(path, _databaseRestorePath, true), Times.Once());
        }

        [TestCase("")]
        [TestCase(ValidConfig)]
        [TestCase("SQLite format")]
        public void restore_should_not_restore_uploaded_database_that_is_not_sqlite(string contents)
        {
            var path = GivenFile("readarr_backup_restore.db", contents);

            Assert.Throws<RestoreBackupFailedException>(() => Subject.Restore(path));

            VerifyNothingRestored();
        }
    }
}
