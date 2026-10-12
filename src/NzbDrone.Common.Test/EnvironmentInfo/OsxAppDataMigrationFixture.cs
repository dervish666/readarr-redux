using System;
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
        public void should_merge_logs_this_start_already_wrote()
        {
            Directory.CreateDirectory(Path.Combine(_newFolder, "logs"));
            File.WriteAllText(Path.Combine(_newFolder, "logs", "readarr.txt"), "new log");

            OsxAppDataMigration.Migrate(_oldFolder, _newFolder);

            Directory.Exists(_oldFolder).Should().BeFalse();
            File.ReadAllText(Path.Combine(_newFolder, "logs", "readarr.txt")).Should().Be("new log");
            File.ReadAllText(Path.Combine(_newFolder, "logs", "readarr.migrated.txt")).Should().Be("log");
            File.Exists(Path.Combine(_newFolder, "config.xml")).Should().BeTrue();
        }

        [Test]
        public void should_not_leave_the_file_system_probe_behind()
        {
            OsxAppDataMigration.Migrate(_oldFolder, _newFolder);

            Directory.GetFileSystemEntries(_newFolder).Should().HaveCount(3);
        }

        [Test]
        public void should_point_settings_inside_the_old_folder_at_the_new_one()
        {
            var oldCert = Path.Combine(_oldFolder, "certs", "readarr.pfx");
            Directory.CreateDirectory(Path.GetDirectoryName(oldCert));
            File.WriteAllText(oldCert, "cert");
            File.WriteAllText(Path.Combine(_oldFolder, "config.xml"), $"<Config><SslCertPath>{oldCert}</SslCertPath><UrlBase>/readarr</UrlBase></Config>");

            OsxAppDataMigration.Migrate(_oldFolder, _newFolder);

            var config = File.ReadAllText(Path.Combine(_newFolder, "config.xml"));
            config.Should().Contain($"<SslCertPath>{Path.Combine(_newFolder, "certs", "readarr.pfx")}</SslCertPath>");
            config.Should().Contain("<UrlBase>/readarr</UrlBase>");
            File.Exists(Path.Combine(_newFolder, "certs", "readarr.pfx")).Should().BeTrue();
        }

        [Test]
        public void should_find_the_legacy_folder_under_an_absolute_xdg_config_home()
        {
            var original = Environment.GetEnvironmentVariable("XDG_CONFIG_HOME");

            try
            {
                Environment.SetEnvironmentVariable("XDG_CONFIG_HOME", "/custom/config");
                OsxAppDataMigration.GetLegacyAppDataFolder().Should().Be(Path.Combine("/custom/config", "Readarr"));

                Environment.SetEnvironmentVariable("XDG_CONFIG_HOME", "relative/config");
                OsxAppDataMigration.GetLegacyAppDataFolder().Should().EndWith(Path.Combine(".config", "Readarr"));
            }
            finally
            {
                Environment.SetEnvironmentVariable("XDG_CONFIG_HOME", original);
            }
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
