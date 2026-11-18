using System;
using System.Collections.Generic;
using System.IO;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Disk;
using NzbDrone.Core.Configuration;
using NzbDrone.Core.MediaFiles;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.ProviderTests.RecycleBinProviderTests
{
    [TestFixture]

    public class DeleteDirectoryFixture : CoreTest
    {
        private void WithRecycleBin()
        {
            Mocker.GetMock<IConfigService>().SetupGet(s => s.RecycleBin).Returns(@"C:\Test\Recycle Bin".AsOsAgnostic());
        }

        private void WithoutRecycleBin()
        {
            Mocker.GetMock<IConfigService>().SetupGet(s => s.RecycleBin).Returns(string.Empty);
        }

        [Test]
        public void should_use_delete_when_recycleBin_is_not_configured()
        {
            WithoutRecycleBin();

            var path = @"C:\Test\TV\30 Rock".AsOsAgnostic();

            Mocker.Resolve<RecycleBinProvider>().DeleteFolder(path);

            Mocker.GetMock<IDiskProvider>().Verify(v => v.DeleteFolder(path, true), Times.Once());
        }

        [Test]
        public void should_use_move_when_recycleBin_is_configured()
        {
            WithRecycleBin();

            var path = @"C:\Test\TV\30 Rock".AsOsAgnostic();

            Mocker.Resolve<RecycleBinProvider>().DeleteFolder(path);

            Mocker.GetMock<IDiskTransferService>()
                  .Verify(v => v.TransferFolder(path, It.Is<string>(p => Path.GetFileName(p).StartsWith("30 Rock.")), TransferMode.Move), Times.Once());
        }

        [Test]
        public void should_keep_same_named_deleted_folders_separate()
        {
            WithRecycleBin();
            var destinations = new List<string>();
            Mocker.GetMock<IDiskTransferService>()
                .Setup(x => x.TransferFolder(It.IsAny<string>(), It.IsAny<string>(), TransferMode.Move))
                .Callback<string, string, TransferMode>((source, target, mode) => destinations.Add(target));

            var recycle = Mocker.Resolve<RecycleBinProvider>();
            recycle.DeleteFolder(@"C:\Books\Author".AsOsAgnostic());
            recycle.DeleteFolder(@"C:\Audio\Author".AsOsAgnostic());

            destinations.Should().OnlyHaveUniqueItems().And.HaveCount(2);
        }

        [Test]
        public void should_call_directorySetLastWriteTime()
        {
            WithRecycleBin();

            var path = @"C:\Test\TV\30 Rock".AsOsAgnostic();

            Mocker.Resolve<RecycleBinProvider>().DeleteFolder(path);

            Mocker.GetMock<IDiskProvider>().Verify(v => v.FolderSetLastWriteTime(It.Is<string>(p => Path.GetFileName(p).StartsWith("30 Rock.")), It.IsAny<DateTime>()), Times.Once());
        }

        [Test]
        public void should_call_fileSetLastWriteTime_for_each_file()
        {
            WindowsOnly();
            WithRecycleBin();
            var path = @"C:\Test\TV\30 Rock".AsOsAgnostic();

            Mocker.GetMock<IDiskProvider>().Setup(s => s.GetFilesNotFollowingLinks(It.IsAny<string>()))
                                           .Returns(new List<string> { "File1", "File2", "File3" });

            Mocker.Resolve<RecycleBinProvider>().DeleteFolder(path);

            Mocker.GetMock<IDiskProvider>().Verify(v => v.FileSetLastWriteTime(It.IsAny<string>(), It.IsAny<DateTime>()), Times.Exactly(3));
        }
    }
}
