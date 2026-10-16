using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Core.Download;
using NzbDrone.Core.Download.TrackedDownloads;
using NzbDrone.Core.MediaFiles.BookImport;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.Download
{
    [TestFixture]
    public class ImportQueueItemFixture : CoreTest<DownloadProcessingService>
    {
        private TrackedDownload _trackedDownload;

        [SetUp]
        public void Setup()
        {
            _trackedDownload = new TrackedDownload
            {
                State = TrackedDownloadState.ImportFailed,
                DownloadItem = new DownloadClientItem
                {
                    DownloadId = "35238",
                    Title = "Defiance of the Fall 6",
                    Status = DownloadItemStatus.Completed
                }
            };

            Mocker.GetMock<ITrackedDownloadService>()
                .Setup(s => s.Find("35238"))
                .Returns(_trackedDownload);
        }

        [Test]
        public void should_import_a_failed_import_with_the_options_asked_for()
        {
            Subject.Execute(new ImportQueueItemCommand { DownloadId = "35238", IgnoreMatchThreshold = true });

            Mocker.GetMock<ICompletedDownloadService>()
                .Verify(v => v.Import(_trackedDownload, It.Is<DownloadImportOptions>(o => o.IgnoreMatchThreshold && !o.ReplaceDestination)), Times.Once());
        }

        [Test]
        public void should_retry_a_failed_import_from_pending()
        {
            Mocker.GetMock<ICompletedDownloadService>()
                .Setup(s => s.Import(_trackedDownload, It.IsAny<DownloadImportOptions>()))
                .Callback(() => _trackedDownload.State.Should().Be(TrackedDownloadState.ImportPending));

            Subject.Execute(new ImportQueueItemCommand { DownloadId = "35238", ReplaceDestination = true });

            Mocker.GetMock<ICompletedDownloadService>()
                .Verify(v => v.Import(_trackedDownload, It.Is<DownloadImportOptions>(o => o.ReplaceDestination)), Times.Once());
        }

        [TestCase(TrackedDownloadState.Downloading)]
        [TestCase(TrackedDownloadState.Importing)]
        [TestCase(TrackedDownloadState.Imported)]
        [TestCase(TrackedDownloadState.Ignored)]
        public void should_not_import_a_download_that_is_not_waiting_to_be_imported(TrackedDownloadState state)
        {
            _trackedDownload.State = state;

            Subject.Execute(new ImportQueueItemCommand { DownloadId = "35238", IgnoreMatchThreshold = true });

            Mocker.GetMock<ICompletedDownloadService>()
                .Verify(v => v.Import(It.IsAny<TrackedDownload>(), It.IsAny<DownloadImportOptions>()), Times.Never());

            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_not_import_a_download_that_is_still_downloading()
        {
            _trackedDownload.DownloadItem.Status = DownloadItemStatus.Downloading;

            Subject.Execute(new ImportQueueItemCommand { DownloadId = "35238", IgnoreMatchThreshold = true });

            Mocker.GetMock<ICompletedDownloadService>()
                .Verify(v => v.Import(It.IsAny<TrackedDownload>(), It.IsAny<DownloadImportOptions>()), Times.Never());

            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_not_import_a_download_that_has_left_the_queue()
        {
            Subject.Execute(new ImportQueueItemCommand { DownloadId = "gone" });

            Mocker.GetMock<ICompletedDownloadService>()
                .Verify(v => v.Import(It.IsAny<TrackedDownload>(), It.IsAny<DownloadImportOptions>()), Times.Never());

            ExceptionVerification.ExpectedWarns(1);
        }
    }
}
