using System.Collections.Generic;
using System.IO;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.EnvironmentInfo;
using NzbDrone.Common.Exceptions;
using NzbDrone.Test.Common;

namespace NzbDrone.Common.Test.EnvironmentInfo
{
    [TestFixture]
    public class OsxAppDataMigrationFixture : TestBase
    {
        private string _oldFolder;
        private string _newFolder;

        [SetUp]
        public void Setup()
        {
            _oldFolder = Path.Combine(TempFolder, "dot-config", "Readarr");
            _newFolder = Path.Combine(TempFolder, "Application Support", "Readarr");

            Directory.CreateDirectory(Path.Combine(_oldFolder, "logs"));
            File.WriteAllText(Path.Combine(_oldFolder, "config.xml"), "<Config />");
            File.WriteAllText(Path.Combine(_oldFolder, "readarr.db"), "db");
            File.WriteAllText(Path.Combine(_oldFolder, "logs", "readarr.txt"), "log");
        }

        [Test]
        public void should_move_everything_and_remove_the_old_folder()
        {
            OsxAppDataMigration.Migrate(_oldFolder, _newFolder);

            Directory.Exists(_oldFolder).Should().BeFalse();
            File.ReadAllText(Path.Combine(_newFolder, "config.xml")).Should().Be("<Config />");
            File.ReadAllText(Path.Combine(_newFolder, "readarr.db")).Should().Be("db");
            File.ReadAllText(Path.Combine(_newFolder, "logs", "readarr.txt")).Should().Be("log");
        }

        [Test]
        public void should_merge_into_an_existing_folder_without_config()
        {
            Directory.CreateDirectory(_newFolder);
            File.WriteAllText(Path.Combine(_newFolder, "other.txt"), "other");

            OsxAppDataMigration.Migrate(_oldFolder, _newFolder);

            Directory.Exists(_oldFolder).Should().BeFalse();
            File.Exists(Path.Combine(_newFolder, "config.xml")).Should().BeTrue();
            File.Exists(Path.Combine(_newFolder, "other.txt")).Should().BeTrue();
        }

        [Test]
        public void should_leave_both_folders_alone_when_the_new_one_has_a_config()
        {
            Directory.CreateDirectory(_newFolder);
            File.WriteAllText(Path.Combine(_newFolder, "config.xml"), "<Config>new</Config>");

            OsxAppDataMigration.Migrate(_oldFolder, _newFolder);

            File.ReadAllText(Path.Combine(_oldFolder, "config.xml")).Should().Be("<Config />");
            File.Exists(Path.Combine(_oldFolder, "readarr.db")).Should().BeTrue();
            File.ReadAllText(Path.Combine(_newFolder, "config.xml")).Should().Be("<Config>new</Config>");
        }

        [Test]
        public void should_do_nothing_without_an_old_folder()
        {
            Directory.Delete(_oldFolder, true);

            OsxAppDataMigration.Migrate(_oldFolder, _newFolder);

            Directory.Exists(_newFolder).Should().BeFalse();
        }

        [Test]
        public void should_stop_on_a_clash_and_keep_config_behind_so_the_move_resumes()
        {
            Directory.CreateDirectory(_newFolder);
            File.WriteAllText(Path.Combine(_newFolder, "readarr.db"), "other db");

            Assert.Throws<ReadarrStartupException>(() => OsxAppDataMigration.Migrate(_oldFolder, _newFolder));

            File.ReadAllText(Path.Combine(_newFolder, "readarr.db")).Should().Be("other db");
            File.Exists(Path.Combine(_oldFolder, "config.xml")).Should().BeTrue();
            File.Exists(Path.Combine(_newFolder, "config.xml")).Should().BeFalse();
        }

        [Test]
        public void should_ignore_a_pid_file_from_a_process_that_is_gone()
        {
            File.WriteAllText(Path.Combine(_oldFolder, "readarr.pid"), int.MaxValue.ToString());

            OsxAppDataMigration.Migrate(_oldFolder, _newFolder);

            Directory.Exists(_oldFolder).Should().BeFalse();
            File.Exists(Path.Combine(_newFolder, "readarr.pid")).Should().BeTrue();
        }

        [Test]
        public void should_not_move_when_the_data_folder_is_overridden()
        {
            var startupContext = new Mock<IStartupContext>();
            startupContext.SetupGet(s => s.Args).Returns(new Dictionary<string, string> { { StartupContext.APPDATA, _newFolder } });

            var appFolderInfo = new Mock<IAppFolderInfo>();
            appFolderInfo.SetupGet(s => s.AppDataFolder).Returns(_newFolder);

            OsxAppDataMigration.Migrate(startupContext.Object, appFolderInfo.Object);

            Directory.Exists(_newFolder).Should().BeFalse();
            appFolderInfo.VerifyGet(s => s.AppDataFolder, Times.Never());
        }
    }
}
