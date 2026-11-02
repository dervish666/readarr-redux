using System.Linq;
using FizzWare.NBuilder;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.Datastore;
using NzbDrone.Core.DecisionEngine;
using NzbDrone.Core.Download;
using NzbDrone.Core.Download.History;
using NzbDrone.Core.Download.TrackedDownloads;
using NzbDrone.Core.Indexers;
using NzbDrone.Core.MediaFiles.BookImport;
using NzbDrone.Core.Parser.Model;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Core.Test.IndexerTests;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.Download
{
    [TestFixture]
    public class RejectedImportServiceFixture : CoreTest<RejectedImportService>
    {
        private TrackedDownload _trackedDownload;

        [SetUp]
        public void Setup()
        {
            var downloadItem = Builder<DownloadClientItem>.CreateNew()
                .With(d => d.DownloadId = "abc")
                .With(d => d.Title = "Author - Book Title")
                .With(d => d.Status = DownloadItemStatus.Completed)
                .Build();

            _trackedDownload = new TrackedDownload
            {
                DownloadItem = downloadItem,
                RemoteBook = new RemoteBook(),
                State = TrackedDownloadState.Importing
            };

            Mocker.GetMock<IDownloadHistoryService>()
                  .Setup(s => s.GetLatestGrab("abc"))
                  .Returns(new DownloadHistory { DownloadId = "abc", IndexerId = 5 });
        }

        private void GivenFailDownloads(params FailDownloads[] failDownloads)
        {
            Mocker.GetMock<IIndexerFactory>()
                  .Setup(s => s.Get(5))
                  .Returns(new IndexerDefinition
                  {
                      Id = 5,
                      Settings = new TestIndexerSettings { FailDownloads = failDownloads.Select(f => (int)f).ToList() }
                  });
        }

        private static ImportResult RejectedDownload(ImportRejectionReason reason)
        {
            var message = "Caution: Found executable file with extension: .exe";

            return new ImportResult(new ImportDecision<LocalBook>(null, new ImportRejection(reason, message)), message);
        }

        [TestCase(ImportRejectionReason.ExecutableFile, FailDownloads.Executables)]
        [TestCase(ImportRejectionReason.DangerousFile, FailDownloads.PotentiallyDangerous)]
        public void should_fail_download_when_indexer_fails_that_kind_of_file(ImportRejectionReason reason, FailDownloads failDownloads)
        {
            GivenFailDownloads(failDownloads);

            Subject.Process(_trackedDownload, RejectedDownload(reason)).Should().BeTrue();

            _trackedDownload.State.Should().Be(TrackedDownloadState.DownloadFailedPending);
            _trackedDownload.Status.Should().Be(TrackedDownloadStatus.Error);
            _trackedDownload.StatusMessages.Single().Messages.Should().Contain(m => m.Contains(".exe"));

            ExceptionVerification.ExpectedWarns(1);
        }

        [TestCase(ImportRejectionReason.ExecutableFile, FailDownloads.PotentiallyDangerous)]
        [TestCase(ImportRejectionReason.DangerousFile, FailDownloads.Executables)]
        public void should_block_import_with_a_warning_when_indexer_does_not_fail_that_kind_of_file(ImportRejectionReason reason, FailDownloads failDownloads)
        {
            GivenFailDownloads(failDownloads);

            Subject.Process(_trackedDownload, RejectedDownload(reason)).Should().BeTrue();

            _trackedDownload.State.Should().Be(TrackedDownloadState.ImportFailed);
            _trackedDownload.Status.Should().Be(TrackedDownloadStatus.Warning);
        }

        [TestCase(FailDownloads.Executables)]
        [TestCase(FailDownloads.PotentiallyDangerous)]
        public void should_fail_download_holding_both_kinds_of_file_when_indexer_fails_either(FailDownloads failDownloads)
        {
            GivenFailDownloads(failDownloads);

            var rejections = new RejectedFileExtensionService().GetRejections(new[] { "Book Title.epub.exe", "Book Title.pdf.lnk" });
            var importResult = new ImportResult(new ImportDecision<LocalBook>(null, rejections.ToArray<Rejection>()), rejections.Select(r => r.Reason).ToArray());

            Subject.Process(_trackedDownload, importResult).Should().BeTrue();

            _trackedDownload.State.Should().Be(TrackedDownloadState.DownloadFailedPending);

            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_block_import_with_a_warning_when_indexer_fails_nothing()
        {
            GivenFailDownloads();

            Subject.Process(_trackedDownload, RejectedDownload(ImportRejectionReason.ExecutableFile)).Should().BeTrue();

            _trackedDownload.State.Should().Be(TrackedDownloadState.ImportFailed);
        }

        [Test]
        public void should_block_import_with_a_warning_when_grabbing_indexer_is_gone()
        {
            Mocker.GetMock<IIndexerFactory>()
                  .Setup(s => s.Get(5))
                  .Throws(new ModelNotFoundException(typeof(IndexerDefinition), 5));

            Subject.Process(_trackedDownload, RejectedDownload(ImportRejectionReason.ExecutableFile)).Should().BeTrue();

            _trackedDownload.State.Should().Be(TrackedDownloadState.ImportFailed);
        }

        [Test]
        public void should_use_the_release_indexer_when_there_is_no_grab_history()
        {
            Mocker.GetMock<IDownloadHistoryService>()
                  .Setup(s => s.GetLatestGrab("abc"))
                  .Returns((DownloadHistory)null);

            _trackedDownload.RemoteBook.Release = new ReleaseInfo { IndexerId = 5 };
            GivenFailDownloads(FailDownloads.Executables);

            Subject.Process(_trackedDownload, RejectedDownload(ImportRejectionReason.ExecutableFile)).Should().BeTrue();

            _trackedDownload.State.Should().Be(TrackedDownloadState.DownloadFailedPending);

            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_not_process_a_rejection_of_one_file()
        {
            GivenFailDownloads(FailDownloads.Executables);

            var result = new ImportResult(new ImportDecision<LocalBook>(new LocalBook { Path = "Book.epub" }, new Rejection("Not an upgrade")), "Not an upgrade");

            Subject.Process(_trackedDownload, result).Should().BeFalse();

            _trackedDownload.State.Should().Be(TrackedDownloadState.Importing);
        }

        [Test]
        public void should_not_process_an_imported_result()
        {
            Subject.Process(_trackedDownload, new ImportResult(new ImportDecision<LocalBook>(new LocalBook()))).Should().BeFalse();
        }
    }
}
