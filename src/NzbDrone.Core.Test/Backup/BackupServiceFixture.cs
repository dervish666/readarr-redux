using System.IO;
using System.Text;
using FluentAssertions;
using ICSharpCode.SharpZipLib.Zip;
using Moq;
using NUnit.Framework;
using NzbDrone.Common;
using NzbDrone.Common.Disk;
using NzbDrone.Common.EnvironmentInfo;
using NzbDrone.Core.Backup;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.Backup
{
    [TestFixture]
    public class BackupServiceFixture : CoreTest<BackupService>
    {
        private string _restoreFolder;

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

            Mocker.GetMock<IDiskProvider>()
                .Setup(s => s.GetFiles(It.IsAny<string>(), false))
                .Returns<string, bool>((path, recursive) => Directory.GetFiles(path));
        }

        private string CreateBackup(params string[] entryNames)
        {
            var path = Path.Combine(TempFolder, "readarr_backup.zip");

            using (var zip = new ZipOutputStream(File.Create(path)))
            {
                zip.NameTransform = null;

                foreach (var name in entryNames)
                {
                    var data = Encoding.UTF8.GetBytes(name);

                    zip.PutNextEntry(new ZipEntry(name));
                    zip.Write(data, 0, data.Length);
                    zip.CloseEntry();
                }
            }

            return path;
        }

        [Test]
        public void restore_should_only_extract_root_config_and_database()
        {
            var backup = CreateBackup("config.xml", "readarr.db", "INFO", "nested/readarr.db", "other.txt");

            Subject.Restore(backup);

            Directory.GetFileSystemEntries(_restoreFolder, "*", SearchOption.AllDirectories)
                .Should().BeEquivalentTo(Path.Combine(_restoreFolder, "config.xml"), Path.Combine(_restoreFolder, "readarr.db"));

            Mocker.GetMock<IDiskProvider>()
                .Verify(v => v.MoveFile(It.IsAny<string>(), It.IsAny<string>(), true), Times.Exactly(2));
        }

        [Test]
        public void restore_should_write_nothing_when_an_entry_escapes_restore_folder()
        {
            var backup = CreateBackup("config.xml", "readarr.db", "../evil.txt");

            Assert.Throws<IOException>(() => Subject.Restore(backup));

            File.Exists(Path.Combine(TempFolder, "evil.txt")).Should().BeFalse();
            Directory.Exists(_restoreFolder).Should().BeFalse();

            Mocker.GetMock<IDiskProvider>()
                .Verify(v => v.MoveFile(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>()), Times.Never());
        }
    }
}
