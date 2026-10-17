using System.Collections.Generic;
using System.IO.Abstractions;
using System.IO.Abstractions.TestingHelpers;
using System.Linq;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Disk;
using NzbDrone.Core.Books;
using NzbDrone.Core.DecisionEngine;
using NzbDrone.Core.Download;
using NzbDrone.Core.Download.TrackedDownloads;
using NzbDrone.Core.History;
using NzbDrone.Core.MediaFiles;
using NzbDrone.Core.MediaFiles.BookImport;
using NzbDrone.Core.MediaFiles.BookImport.Manual;
using NzbDrone.Core.Messaging.Events;
using NzbDrone.Core.Parser.Model;
using NzbDrone.Core.RootFolders;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.MediaFiles.BookImport.Manual
{
    [TestFixture]
    public class ManualImportServiceFixture : CoreTest<ManualImportService>
    {
        private static readonly string Folder = @"C:\books\AudioBooks\TheFirstDefier".AsOsAgnostic();

        private List<IFileInfo> _files;
        private Book _book;

        [SetUp]
        public void Setup()
        {
            var fileSystem = new MockFileSystem();

            _files = new[] { 1, 4, 6 }
                .Select(n => System.IO.Path.Combine(Folder, $"Defiance of the Fall {n}", $"TheFirstDefier - Defiance of the Fall {n}.m4b"))
                .Select(p =>
                {
                    fileSystem.AddFile(p, new MockFileData(string.Empty));
                    return fileSystem.FileInfo.FromFileName(p);
                })
                .ToList();

            _book = new Book { Id = 4, Title = "Defiance of the Fall 4" };

            Mocker.GetMock<IDiskProvider>().Setup(s => s.FolderExists(Folder)).Returns(true);
            Mocker.GetMock<IDiskScanService>().Setup(s => s.GetBookFiles(Folder, true)).Returns(_files.ToArray());
        }

        private ImportDecision<LocalBook> Decision(IFileInfo file, bool additional, params Rejection[] rejections)
        {
            return new ImportDecision<LocalBook>(new LocalBook { Path = file.FullName, Book = _book, AdditionalFile = additional }, rejections);
        }

        private TrackedDownload GivenManualImportFromDownload(string downloadFolder, IEnumerable<string> filesInFolder)
        {
            var fileSystem = new MockFileSystem();
            var files = filesInFolder.Select(p =>
                {
                    fileSystem.AddFile(p, new MockFileData(string.Empty));
                    return fileSystem.FileInfo.FromFileName(p);
                })
                .ToArray();

            var author = new Author { Id = 1, Path = @"C:\books\AudioBooks\Brian McClellan".AsOsAgnostic() };
            var item = new DownloadClientItem { DownloadId = "dl", Title = "The Autumn Republic", OutputPath = new OsPath(downloadFolder) };
            var trackedDownload = new TrackedDownload
            {
                DownloadItem = item,
                ImportItem = item,
                State = TrackedDownloadState.ImportFailed,
                RemoteBook = new RemoteBook { Books = new List<Book> { _book } }
            };

            Mocker.GetMock<IAuthorService>().Setup(s => s.GetAuthor(1)).Returns(author);
            Mocker.GetMock<IBookService>().Setup(s => s.GetBook(_book.Id)).Returns(_book);
            Mocker.GetMock<IEditionService>().Setup(s => s.GetEditionByForeignEditionId(It.IsAny<string>())).Returns(new Edition());
            Mocker.GetMock<IRootFolderService>().Setup(s => s.GetBestRootFolder(It.IsAny<string>())).Returns(new RootFolder());
            Mocker.GetMock<IDiskProvider>().Setup(s => s.GetFileInfo(It.IsAny<string>())).Returns<string>(p => fileSystem.FileInfo.FromFileName(p));
            Mocker.GetMock<IDiskProvider>().Setup(s => s.FolderExists(downloadFolder)).Returns(true);
            Mocker.GetMock<IDiskScanService>().Setup(s => s.GetBookFiles(downloadFolder, true)).Returns(files);
            Mocker.GetMock<IDiskScanService>().Setup(s => s.FilterFiles(downloadFolder, It.IsAny<IEnumerable<IFileInfo>>())).Returns<string, IEnumerable<IFileInfo>>((_, f) => f.Where(x => !x.FullName.Contains("extras")).ToList());
            Mocker.GetMock<IDiskProvider>().Setup(s => s.GetAllFilesOrThrow(downloadFolder)).Returns(filesInFolder.ToList());
            Mocker.GetMock<ITrackedDownloadService>().Setup(s => s.Find("dl")).Returns(trackedDownload);
            GivenImportedBefore();

            Mocker.GetMock<IImportApprovedBooks>()
                  .Setup(s => s.Import(It.IsAny<List<ImportDecision<LocalBook>>>(), It.IsAny<bool>(), It.IsAny<DownloadClientItem>(), It.IsAny<ImportMode>()))
                  .Returns<List<ImportDecision<LocalBook>>, bool, DownloadClientItem, ImportMode>((d, r, i, m) => d.Select(x => new ImportResult(x)).ToList());

            return trackedDownload;
        }

        private void GivenImportedBefore(params string[] droppedPaths)
        {
            Mocker.GetMock<IHistoryService>()
                  .Setup(s => s.FindByDownloadId("dl"))
                  .Returns(droppedPaths.Select(p => new EntityHistory
                  {
                      EventType = EntityHistoryEventType.BookFileImported,
                      DownloadId = "dl",
                      Data = new Dictionary<string, string> { { "DroppedPath", p } }
                  }).ToList());
        }

        // The scan skips extras/, so manual import never lists the file there; it is still in the download
        [Test]
        public void manual_import_should_not_complete_a_download_with_audio_in_a_folder_the_scan_skips()
        {
            var folder = @"C:\downloads\The Autumn Republic".AsOsAgnostic();
            var part = System.IO.Path.Combine(folder, "Part 01.mp3");
            var extra = System.IO.Path.Combine(folder, "extras", "Part 02.mp3");

            var trackedDownload = GivenManualImportFromDownload(folder, new[] { part, extra });

            Subject.Execute(ImportCommand(part));

            Mocker.GetMock<IEventAggregator>()
                  .Verify(v => v.PublishEvent(It.IsAny<DownloadCompletedEvent>()), Times.Never());

            trackedDownload.State.Should().Be(TrackedDownloadState.ImportFailed);
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void manual_import_should_not_complete_a_download_whose_folder_cannot_be_listed()
        {
            var folder = @"C:\downloads\The Autumn Republic".AsOsAgnostic();
            var part = System.IO.Path.Combine(folder, "Part 01.mp3");

            var trackedDownload = GivenManualImportFromDownload(folder, new[] { part });

            Mocker.GetMock<IDiskProvider>().Setup(s => s.GetAllFilesOrThrow(folder)).Throws(new System.UnauthorizedAccessException("denied"));

            Subject.Execute(ImportCommand(part));

            Mocker.GetMock<IEventAggregator>()
                  .Verify(v => v.PublishEvent(It.IsAny<DownloadCompletedEvent>()), Times.Never());

            trackedDownload.State.Should().Be(TrackedDownloadState.ImportFailed);
            ExceptionVerification.ExpectedWarns(1);
        }

        // A selection from an older listing: the file is readable elsewhere, the download's own path is empty
        [Test]
        public void manual_import_should_not_complete_a_download_from_files_outside_its_path()
        {
            var folder = @"C:\downloads\The Autumn Republic".AsOsAgnostic();
            var stale = System.IO.Path.Combine(@"C:\old\The Autumn Republic".AsOsAgnostic(), "Part 01.mp3");

            var trackedDownload = GivenManualImportFromDownload(folder, new[] { stale });
            Mocker.GetMock<IDiskProvider>().Setup(s => s.GetAllFilesOrThrow(folder)).Returns(new List<string>());

            Subject.Execute(ImportCommand(stale));

            Mocker.GetMock<IEventAggregator>()
                  .Verify(v => v.PublishEvent(It.IsAny<DownloadCompletedEvent>()), Times.Never());

            trackedDownload.State.Should().Be(TrackedDownloadState.ImportFailed);
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void manual_import_should_not_complete_a_download_whose_path_went_missing()
        {
            var folder = @"C:\downloads\The Autumn Republic".AsOsAgnostic();
            var part = System.IO.Path.Combine(folder, "Part 01.mp3");

            var trackedDownload = GivenManualImportFromDownload(folder, new[] { part });
            Mocker.GetMock<IDiskProvider>().Setup(s => s.FolderExists(folder)).Returns(false);

            Subject.Execute(ImportCommand(part));

            Mocker.GetMock<IEventAggregator>()
                  .Verify(v => v.PublishEvent(It.IsAny<DownloadCompletedEvent>()), Times.Never());

            trackedDownload.State.Should().Be(TrackedDownloadState.ImportFailed);
            ExceptionVerification.ExpectedWarns(1);
        }

        // Copy or hard link leaves part 1 in the folder after the first pass; it was imported, not left behind
        [Test]
        public void manual_import_should_complete_a_download_imported_in_two_copy_passes()
        {
            var folder = @"C:\downloads\The Autumn Republic".AsOsAgnostic();
            var parts = new[] { 1, 2 }.Select(n => System.IO.Path.Combine(folder, $"Part {n:00}.mp3")).ToList();

            var trackedDownload = GivenManualImportFromDownload(folder, parts);

            var first = ImportCommand(parts[0]);
            first.ImportMode = ImportMode.Copy;
            Subject.Execute(first);

            trackedDownload.State.Should().Be(TrackedDownloadState.ImportFailed);

            GivenImportedBefore(parts[0]);

            var second = ImportCommand(parts[1]);
            second.ImportMode = ImportMode.Copy;
            Subject.Execute(second);

            Mocker.GetMock<IEventAggregator>()
                  .Verify(v => v.PublishEvent(It.IsAny<DownloadCompletedEvent>()), Times.Once());

            trackedDownload.State.Should().Be(TrackedDownloadState.Imported);
            ExceptionVerification.ExpectedWarns(1);
        }

        private ManualImportCommand ImportCommand(params string[] paths)
        {
            return new ManualImportCommand
            {
                Files = paths.Select(p => new ManualImportFile { Path = p, AuthorId = 1, BookId = _book.Id, DownloadId = "dl" }).ToList(),
                ImportMode = ImportMode.Move
            };
        }

        [Test]
        public void manual_import_should_not_complete_a_download_while_parts_the_user_did_not_pick_are_still_in_it()
        {
            var folder = @"C:\downloads\The Autumn Republic".AsOsAgnostic();
            var parts = new[] { 1, 2 }.Select(n => System.IO.Path.Combine(folder, $"Part {n:00}.mp3")).ToList();

            var trackedDownload = GivenManualImportFromDownload(folder, parts);

            Subject.Execute(ImportCommand(parts[0]));

            Mocker.GetMock<IEventAggregator>()
                  .Verify(v => v.PublishEvent(It.IsAny<DownloadCompletedEvent>()), Times.Never());

            trackedDownload.State.Should().Be(TrackedDownloadState.ImportFailed);
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void manual_import_should_complete_a_download_once_every_part_in_it_was_imported()
        {
            var folder = @"C:\downloads\The Autumn Republic".AsOsAgnostic();
            var parts = new[] { 1, 2 }.Select(n => System.IO.Path.Combine(folder, $"Part {n:00}.mp3")).ToList();

            var trackedDownload = GivenManualImportFromDownload(folder, parts);

            Subject.Execute(ImportCommand(parts.ToArray()));

            Mocker.GetMock<IEventAggregator>()
                  .Verify(v => v.PublishEvent(It.IsAny<DownloadCompletedEvent>()), Times.Once());

            trackedDownload.State.Should().Be(TrackedDownloadState.Imported);
        }

        // Three files all tagged as book 4: each is its own release, and each release also carries book 4's files
        // on disk as additional files, so every path comes back three times
        [Test]
        public void should_return_one_row_per_file_preferring_its_own_decision()
        {
            var decisions = new List<ImportDecision<LocalBook>>();

            foreach (var own in _files)
            {
                decisions.Add(Decision(own, false));
                decisions.AddRange(_files.Where(f => f != own).Select(f => Decision(f, true, new Rejection("Has the same filesize as existing file"))));
            }

            Mocker.GetMock<IMakeImportDecision>()
                  .Setup(s => s.GetImportDecisions(It.IsAny<List<IFileInfo>>(), It.IsAny<IdentificationOverrides>(), It.IsAny<ImportDecisionMakerInfo>(), It.IsAny<ImportDecisionMakerConfig>()))
                  .Returns(decisions);

            var items = Subject.GetMediaFiles(Folder, null, null, FilterFilesType.None, false);

            items.Should().HaveCount(3);
            items.Select(i => i.Path).Should().OnlyHaveUniqueItems();
            items.Should().OnlyContain(i => !i.AdditionalFile && !i.Rejections.Any());
        }
    }
}
