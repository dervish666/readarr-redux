using System;
using System.Collections.Generic;
using System.IO;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Disk;
using NzbDrone.Common.EnvironmentInfo;
using NzbDrone.Test.Common;

namespace NzbDrone.Common.Test.EnvironmentInfo
{
    [TestFixture]
    public class AppFolderFactoryFixture : TestBase<AppFolderFactory>
    {
        private const string NewAppDataFolder = "/Users/readarr/Library/Application Support/Readarr";

        private string _oldAppDataFolder;
        private Dictionary<string, string> _args;

        [SetUp]
        public void Setup()
        {
            if (!OsInfo.IsOsx)
            {
                throw new IgnoreException("macOS specific test");
            }

            _oldAppDataFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile, Environment.SpecialFolderOption.DoNotVerify), ".config", "Readarr");
            _args = new Dictionary<string, string>();

            Mocker.GetMock<IStartupContext>()
                .SetupGet(s => s.Args)
                .Returns(_args);

            Mocker.GetMock<IAppFolderInfo>()
                .SetupGet(s => s.AppDataFolder)
                .Returns(NewAppDataFolder);

            // Every folder exists, so the XDG fallback in Register leaves the environment alone
            Mocker.GetMock<IDiskProvider>()
                .Setup(s => s.FolderExists(It.IsAny<string>()))
                .Returns(true);

            Mocker.GetMock<IDiskProvider>()
                .Setup(s => s.FolderWritable(NewAppDataFolder))
                .Returns(true);
        }

        [Test]
        public void should_move_the_old_data_folder_when_the_new_one_has_no_config()
        {
            Subject.Register();

            Mocker.GetMock<IDiskTransferService>()
                .Verify(s => s.MirrorFolder(_oldAppDataFolder, NewAppDataFolder), Times.Once());

            Mocker.GetMock<IDiskProvider>()
                .Verify(s => s.DeleteFolder(_oldAppDataFolder, true), Times.Once());
        }

        [Test]
        public void should_not_move_when_the_new_data_folder_has_a_config()
        {
            Mocker.GetMock<IDiskProvider>()
                .Setup(s => s.FileExists(Path.Combine(NewAppDataFolder, "config.xml")))
                .Returns(true);

            Subject.Register();

            Mocker.GetMock<IDiskTransferService>()
                .Verify(s => s.MirrorFolder(It.IsAny<string>(), It.IsAny<string>()), Times.Never());
        }

        [Test]
        public void should_not_move_when_there_is_no_old_data_folder()
        {
            Mocker.GetMock<IDiskProvider>()
                .Setup(s => s.FolderExists(_oldAppDataFolder))
                .Returns(false);

            Subject.Register();

            Mocker.GetMock<IDiskTransferService>()
                .Verify(s => s.MirrorFolder(It.IsAny<string>(), It.IsAny<string>()), Times.Never());
        }

        [Test]
        public void should_not_move_when_the_data_folder_is_overridden()
        {
            _args.Add(StartupContext.APPDATA, NewAppDataFolder);

            Subject.Register();

            Mocker.GetMock<IDiskTransferService>()
                .Verify(s => s.MirrorFolder(It.IsAny<string>(), It.IsAny<string>()), Times.Never());

            Mocker.GetMock<IDiskProvider>()
                .Verify(s => s.DeleteFolder(It.IsAny<string>(), It.IsAny<bool>()), Times.Never());
        }
    }
}
