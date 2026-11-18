using System.Collections.Generic;
using Moq;
using NUnit.Framework;
using NzbDrone.Core.Configuration;
using NzbDrone.Core.Download;
using NzbDrone.Core.Download.TrackedDownloads;
using NzbDrone.Core.MediaFiles.BookImport;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.Download
{
    [TestFixture]
    public class ProcessMonitoredDownloadsFixture : CoreTest<DownloadProcessingService>
    {
        private TrackedDownload _trackedDownload;

        [SetUp]
        public void Setup()
        {
            _trackedDownload = new TrackedDownload
            {
                State = TrackedDownloadState.ImportPending,
                IsTrackable = true,
                DownloadItem = new DownloadClientItem
                {
                    DownloadId = "35238",
                    Title = "Author - Book Title",
                    Status = DownloadItemStatus.Completed
                }
            };

            Mocker.GetMock<IConfigService>()
                  .SetupGet(s => s.EnableCompletedDownloadHandling)
                  .Returns(true);

            Mocker.GetMock<ITrackedDownloadService>()
                  .Setup(s => s.GetTrackedDownloads())
                  .Returns(new List<TrackedDownload> { _trackedDownload });
        }

        [Test]
        public void should_process_a_download_its_import_failed_on_the_same_pass()
        {
            Mocker.GetMock<ICompletedDownloadService>()
                  .Setup(s => s.Import(_trackedDownload, It.IsAny<DownloadImportOptions>()))
                  .Callback(() => _trackedDownload.Fail(new TrackedDownloadStatusMessage(_trackedDownload.DownloadItem.Title, "Caution: Found executable file with extension: .exe")));

            Subject.Execute(new ProcessMonitoredDownloadsCommand());

            Mocker.GetMock<IFailedDownloadService>()
                  .Verify(s => s.ProcessFailed(_trackedDownload), Times.Once());
        }

        [Test]
        public void should_not_process_failed_when_import_did_not_fail_the_download()
        {
            Subject.Execute(new ProcessMonitoredDownloadsCommand());

            Mocker.GetMock<ICompletedDownloadService>()
                  .Verify(s => s.Import(_trackedDownload, It.IsAny<DownloadImportOptions>()), Times.Once());
            Mocker.GetMock<IFailedDownloadService>()
                  .Verify(s => s.ProcessFailed(It.IsAny<TrackedDownload>()), Times.Never());
        }
    }
}
