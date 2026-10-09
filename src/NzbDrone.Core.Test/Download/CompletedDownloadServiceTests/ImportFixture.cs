using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using FizzWare.NBuilder;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Disk;
using NzbDrone.Core.Books;
using NzbDrone.Core.Datastore;
using NzbDrone.Core.DecisionEngine;
using NzbDrone.Core.Download;
using NzbDrone.Core.Download.TrackedDownloads;
using NzbDrone.Core.History;
using NzbDrone.Core.MediaFiles;
using NzbDrone.Core.MediaFiles.BookImport;
using NzbDrone.Core.MediaFiles.BookImport.Specifications;
using NzbDrone.Core.MediaFiles.Events;
using NzbDrone.Core.Messaging.Events;
using NzbDrone.Core.Parser;
using NzbDrone.Core.Parser.Model;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.Download.CompletedDownloadServiceTests
{
    [TestFixture]
    public class ImportFixture : CoreTest<CompletedDownloadService>
    {
        private const int AutumnRepublicId = 40224712;

        private TrackedDownload _trackedDownload;
        private Author _author;

        [SetUp]
        public void Setup()
        {
            var completed = Builder<DownloadClientItem>.CreateNew()
                                                    .With(h => h.Status = DownloadItemStatus.Completed)
                                                    .With(h => h.OutputPath = new OsPath(@"C:\DropFolder\MyDownload".AsOsAgnostic()))
                                                    .With(h => h.Title = "Drone.S01E01.HDTV")
                                                    .Build();

            var remoteBook = BuildRemoteBook();

            _trackedDownload = Builder<TrackedDownload>.CreateNew()
                    .With(c => c.State = TrackedDownloadState.Downloading)
                    .With(c => c.DownloadItem = completed)
                    .With(c => c.RemoteBook = remoteBook)
                    .Build();

            _author = Builder<Author>.CreateNew()
                .Build();

            Mocker.GetMock<IDownloadClient>()
              .SetupGet(c => c.Definition)
              .Returns(new DownloadClientDefinition { Id = 1, Name = "testClient" });

            Mocker.GetMock<IProvideDownloadClient>()
                  .Setup(c => c.Get(It.IsAny<int>()))
                  .Returns(Mocker.GetMock<IDownloadClient>().Object);

            Mocker.GetMock<IHistoryService>()
                  .Setup(s => s.MostRecentForDownloadId(_trackedDownload.DownloadItem.DownloadId))
                  .Returns(new EntityHistory());

            Mocker.GetMock<IParsingService>()
                  .Setup(s => s.GetAuthor("Drone.S01E01.HDTV"))
                  .Returns(remoteBook.Author);

            Mocker.GetMock<IHistoryService>()
                .Setup(s => s.FindByDownloadId(It.IsAny<string>()))
                .Returns(new List<EntityHistory>());

            Mocker.GetMock<IHistoryService>()
                .Setup(s => s.FindGrabsByDownloadId(It.IsAny<string>()))
                .Returns(new List<EntityHistory>());

            Mocker.SetConstant<IPartsLeftBehindService>(Mocker.Resolve<PartsLeftBehindService>());

            Mocker.GetMock<IProvideImportItemService>()
                .Setup(s => s.ProvideImportItem(It.IsAny<DownloadClientItem>(), It.IsAny<DownloadClientItem>()))
                .Returns<DownloadClientItem, DownloadClientItem>((i, p) => i);
        }

        private Book CreateBook(int id)
        {
            return new Book
            {
                Id = id
            };
        }

        private RemoteBook BuildRemoteBook()
        {
            return new RemoteBook
            {
                Author = new Author(),
                Books = new List<Book> { CreateBook(1) }
            };
        }

        private void GivenABadlyNamedDownload()
        {
            _trackedDownload.DownloadItem.DownloadId = "1234";
            _trackedDownload.DownloadItem.Title = "Droned Pilot"; // Set a badly named download
            Mocker.GetMock<IHistoryService>()
               .Setup(s => s.MostRecentForDownloadId(It.Is<string>(i => i == "1234")))
               .Returns(new EntityHistory() { SourceTitle = "Droned S01E01" });

            Mocker.GetMock<IParsingService>()
               .Setup(s => s.GetAuthor(It.IsAny<string>()))
               .Returns((Author)null);

            Mocker.GetMock<IParsingService>()
                .Setup(s => s.GetAuthor("Droned S01E01"))
                .Returns(BuildRemoteBook().Author);
        }

        private void GivenAuthorMatch()
        {
            Mocker.GetMock<IParsingService>()
                  .Setup(s => s.GetAuthor(It.IsAny<string>()))
                  .Returns(_trackedDownload.RemoteBook.Author);
        }

        [Test]
        public void should_not_mark_as_imported_if_all_files_were_rejected()
        {
            Mocker.GetMock<IDownloadedBooksImportService>()
                  .Setup(v => v.ProcessPath(It.IsAny<string>(), It.IsAny<ImportMode>(), It.IsAny<Author>(), It.IsAny<DownloadClientItem>(), It.IsAny<Book>()))
                  .Returns(new List<ImportResult>
                           {
                               new ImportResult(
                                   new ImportDecision<LocalBook>(
                                       new LocalBook { Path = @"C:\TestPath\Droned.S01E01.mkv".AsOsAgnostic() }, new Rejection("Rejected!")), "Test Failure"),

                               new ImportResult(
                                   new ImportDecision<LocalBook>(
                                       new LocalBook { Path = @"C:\TestPath\Droned.S01E02.mkv".AsOsAgnostic() }, new Rejection("Rejected!")), "Test Failure")
                           });

            Subject.Import(_trackedDownload);

            Mocker.GetMock<IEventAggregator>()
                .Verify(v => v.PublishEvent<DownloadCompletedEvent>(It.IsAny<DownloadCompletedEvent>()), Times.Never());

            AssertNotImported();
        }

        [Test]
        public void should_not_mark_as_imported_if_no_tracks_were_parsed()
        {
            Mocker.GetMock<IDownloadedBooksImportService>()
                  .Setup(v => v.ProcessPath(It.IsAny<string>(), It.IsAny<ImportMode>(), It.IsAny<Author>(), It.IsAny<DownloadClientItem>(), It.IsAny<Book>()))
                  .Returns(new List<ImportResult>
                           {
                               new ImportResult(
                                   new ImportDecision<LocalBook>(
                                       new LocalBook { Path = @"C:\TestPath\Droned.S01E01.mkv".AsOsAgnostic() }, new Rejection("Rejected!")), "Test Failure"),

                               new ImportResult(
                                   new ImportDecision<LocalBook>(
                                       new LocalBook { Path = @"C:\TestPath\Droned.S01E02.mkv".AsOsAgnostic() }, new Rejection("Rejected!")), "Test Failure")
                           });

            _trackedDownload.RemoteBook.Books.Clear();

            Subject.Import(_trackedDownload);

            AssertNotImported();
        }

        [Test]
        public void should_not_mark_as_failed_if_nothing_found_to_import()
        {
            Mocker.GetMock<IDownloadedBooksImportService>()
                .Setup(v => v.ProcessPath(It.IsAny<string>(), It.IsAny<ImportMode>(), It.IsAny<Author>(), It.IsAny<DownloadClientItem>(), It.IsAny<Book>()))
                .Returns(new List<ImportResult>());

            Subject.Import(_trackedDownload);

            _trackedDownload.State.Should().Be(TrackedDownloadState.ImportPending);
        }

        [Test]
        public void should_not_mark_as_imported_if_all_files_were_skipped()
        {
            Mocker.GetMock<IDownloadedBooksImportService>()
                  .Setup(v => v.ProcessPath(It.IsAny<string>(), It.IsAny<ImportMode>(), It.IsAny<Author>(), It.IsAny<DownloadClientItem>(), It.IsAny<Book>()))
                  .Returns(new List<ImportResult>
                           {
                               new ImportResult(new ImportDecision<LocalBook>(new LocalBook { Path = @"C:\TestPath\Droned.S01E01.mkv".AsOsAgnostic() }), "Test Failure"),
                               new ImportResult(new ImportDecision<LocalBook>(new LocalBook { Path = @"C:\TestPath\Droned.S01E01.mkv".AsOsAgnostic() }), "Test Failure")
                           });

            Subject.Import(_trackedDownload);

            AssertNotImported();
        }

        [Test]
        public void should_mark_as_imported_if_all_tracks_were_imported_but_extra_files_were_not()
        {
            GivenAuthorMatch();

            _trackedDownload.RemoteBook.Books = new List<Book>
            {
                CreateBook(1)
            };

            Mocker.GetMock<IDownloadedBooksImportService>()
                  .Setup(v => v.ProcessPath(It.IsAny<string>(), It.IsAny<ImportMode>(), It.IsAny<Author>(), It.IsAny<DownloadClientItem>(), It.IsAny<Book>()))
                  .Returns(new List<ImportResult>
                           {
                               new ImportResult(new ImportDecision<LocalBook>(new LocalBook { Path = @"C:\TestPath\Droned.S01E01.mkv".AsOsAgnostic(), Author = _author })),
                               new ImportResult(new ImportDecision<LocalBook>(new LocalBook { Path = @"C:\TestPath\Droned.S01E01.mkv".AsOsAgnostic(), Author = _author }), "Test Failure")
                           });

            Mocker.GetMock<IHistoryService>()
                  .Setup(s => s.FindByDownloadId(It.IsAny<string>()))
                  .Returns(new List<EntityHistory>());

            Subject.Import(_trackedDownload);

            AssertImported();
        }

        [Test]
        public void should_not_mark_as_imported_if_some_tracks_were_not_imported()
        {
            _trackedDownload.RemoteBook.Books = new List<Book>
            {
                CreateBook(1),
                CreateBook(1),
                CreateBook(1)
            };

            Mocker.GetMock<IDownloadedBooksImportService>()
                  .Setup(v => v.ProcessPath(It.IsAny<string>(), It.IsAny<ImportMode>(), It.IsAny<Author>(), It.IsAny<DownloadClientItem>(), It.IsAny<Book>()))
                  .Returns(new List<ImportResult>
                           {
                               new ImportResult(new ImportDecision<LocalBook>(new LocalBook { Path = @"C:\TestPath\Droned.S01E01.mkv".AsOsAgnostic() })),
                               new ImportResult(new ImportDecision<LocalBook>(new LocalBook { Path = @"C:\TestPath\Droned.S01E01.mkv".AsOsAgnostic() })),
                               new ImportResult(new ImportDecision<LocalBook>(new LocalBook { Path = @"C:\TestPath\Droned.S01E01.mkv".AsOsAgnostic() }), "Test Failure"),
                               new ImportResult(new ImportDecision<LocalBook>(new LocalBook { Path = @"C:\TestPath\Droned.S01E01.mkv".AsOsAgnostic() }), "Test Failure"),
                               new ImportResult(new ImportDecision<LocalBook>(new LocalBook { Path = @"C:\TestPath\Droned.S01E01.mkv".AsOsAgnostic() }), "Test Failure")
                           });

            var history = Builder<EntityHistory>.CreateListOfSize(2)
                                                  .BuildList();

            Mocker.GetMock<IHistoryService>()
                  .Setup(s => s.FindByDownloadId(It.IsAny<string>()))
                  .Returns(history);

            Mocker.GetMock<ITrackedDownloadAlreadyImported>()
                  .Setup(s => s.IsImported(_trackedDownload, history))
                  .Returns(true);

            Subject.Import(_trackedDownload);

            AssertNotImported();
        }

        [Test]
        public void should_not_mark_as_imported_if_some_of_episodes_were_not_imported_including_history()
        {
            var books = Builder<Book>.CreateListOfSize(3).BuildList();

            _trackedDownload.RemoteBook.Books = books;

            Mocker.GetMock<IDownloadedBooksImportService>()
                .Setup(v => v.ProcessPath(It.IsAny<string>(), It.IsAny<ImportMode>(), It.IsAny<Author>(), It.IsAny<DownloadClientItem>(), It.IsAny<Book>()))
                .Returns(new List<ImportResult>
                {
                    new ImportResult(new ImportDecision<LocalBook>(new LocalBook { Path = @"C:\TestPath\Droned.S01E01.mkv" })),
                    new ImportResult(new ImportDecision<LocalBook>(new LocalBook { Path = @"C:\TestPath\Droned.S01E01.mkv" }), "Test Failure"),
                    new ImportResult(new ImportDecision<LocalBook>(new LocalBook { Path = @"C:\TestPath\Droned.S01E01.mkv" }), "Test Failure")
                });

            var history = Builder<EntityHistory>.CreateListOfSize(2)
                                                  .BuildList();

            Mocker.GetMock<IHistoryService>()
                  .Setup(s => s.FindByDownloadId(It.IsAny<string>()))
                  .Returns(history);

            Mocker.GetMock<ITrackedDownloadAlreadyImported>()
                  .Setup(s => s.IsImported(It.IsAny<TrackedDownload>(), It.IsAny<List<EntityHistory>>()))
                  .Returns(false);

            Subject.Import(_trackedDownload);

            AssertNotImported();
        }

        [Test]
        public void should_mark_as_imported_if_all_tracks_were_imported()
        {
            _trackedDownload.RemoteBook.Books = new List<Book>
            {
                CreateBook(1)
            };

            Mocker.GetMock<IDownloadedBooksImportService>()
                  .Setup(v => v.ProcessPath(It.IsAny<string>(), It.IsAny<ImportMode>(), It.IsAny<Author>(), It.IsAny<DownloadClientItem>(), It.IsAny<Book>()))
                  .Returns(new List<ImportResult>
                           {
                               new ImportResult(
                                   new ImportDecision<LocalBook>(
                                       new LocalBook { Path = @"C:\TestPath\Droned.S01E01.mkv".AsOsAgnostic(), Author = _author })),

                               new ImportResult(
                                   new ImportDecision<LocalBook>(
                                       new LocalBook { Path = @"C:\TestPath\Droned.S01E02.mkv".AsOsAgnostic(), Author = _author }))
                           });

            Subject.Import(_trackedDownload);

            AssertImported();
        }

        [Test]
        public void should_mark_as_imported_if_all_episodes_were_imported_including_history()
        {
            var books = Builder<Book>.CreateListOfSize(2).BuildList();

            _trackedDownload.RemoteBook.Books = books;

            Mocker.GetMock<IDownloadedBooksImportService>()
                .Setup(v => v.ProcessPath(It.IsAny<string>(), It.IsAny<ImportMode>(), It.IsAny<Author>(), It.IsAny<DownloadClientItem>(), It.IsAny<Book>()))
                .Returns(new List<ImportResult>
                {
                    new ImportResult(
                        new ImportDecision<LocalBook>(
                            new LocalBook { Path = @"C:\TestPath\Droned.S01E01.mkv", Book = books[0], Author = _author })),

                    new ImportResult(
                        new ImportDecision<LocalBook>(
                            new LocalBook { Path = @"C:\TestPath\Droned.S01E02.mkv", Book = books[1], Author = _author }), "Test Failure")
                });

            var history = Builder<EntityHistory>.CreateListOfSize(2)
                .All()
                .With(x => x.EventType = EntityHistoryEventType.BookFileImported)
                .With(x => x.AuthorId = 1)
                .BuildList();

            Mocker.GetMock<IHistoryService>()
                  .Setup(s => s.FindByDownloadId(It.IsAny<string>()))
                  .Returns(history);

            Mocker.GetMock<ITrackedDownloadAlreadyImported>()
                  .Setup(s => s.IsImported(It.IsAny<TrackedDownload>(), It.IsAny<List<EntityHistory>>()))
                  .Returns(true);

            Subject.Import(_trackedDownload);

            AssertImported();
        }

        [Test]
        public void should_mark_as_imported_if_the_download_can_be_tracked_using_the_source_seriesid()
        {
            GivenABadlyNamedDownload();

            Mocker.GetMock<IDownloadedBooksImportService>()
                  .Setup(v => v.ProcessPath(It.IsAny<string>(), It.IsAny<ImportMode>(), It.IsAny<Author>(), It.IsAny<DownloadClientItem>(), It.IsAny<Book>()))
                  .Returns(new List<ImportResult>
                           {
                               new ImportResult(new ImportDecision<LocalBook>(new LocalBook { Path = @"C:\TestPath\Droned.S01E01.mkv".AsOsAgnostic(), Author = _author }))
                           });

            Subject.Import(_trackedDownload);

            AssertImported();
        }

        private Book GivenBookInLibrary(int id, string title)
        {
            var book = new Book { Id = id, Title = title, AuthorMetadataId = _trackedDownload.RemoteBook.Author.AuthorMetadataId };

            Mocker.GetMock<IBookService>()
                  .Setup(s => s.GetBook(id))
                  .Returns(book);

            return book;
        }

        private void GivenGrabs(params EntityHistory[] grabs)
        {
            Mocker.GetMock<IHistoryService>()
                  .Setup(s => s.FindGrabsByDownloadId(_trackedDownload.DownloadItem.DownloadId))
                  .Returns(grabs.ToList());
        }

        private EntityHistory Grab(int bookId, DateTime date, string sourceTitle = "Orson Scott Card - Ruins Pathfinder, Book 2 (Unabridged) MP3")
        {
            return new EntityHistory
            {
                EventType = EntityHistoryEventType.Grabbed,
                DownloadId = _trackedDownload.DownloadItem.DownloadId,
                BookId = bookId,
                Date = date,
                SourceTitle = sourceTitle
            };
        }

        private Book ImportAndGetPinnedBook()
        {
            Book pinned = null;

            Mocker.GetMock<IDownloadedBooksImportService>()
                  .Setup(v => v.ProcessPath(It.IsAny<string>(), It.IsAny<ImportMode>(), It.IsAny<Author>(), It.IsAny<DownloadClientItem>(), It.IsAny<Book>()))
                  .Callback<string, ImportMode, Author, DownloadClientItem, Book>((path, mode, author, item, book) => pinned = book)
                  .Returns(new List<ImportResult>());

            Subject.Import(_trackedDownload);

            return pinned;
        }

        [Test]
        public void should_import_into_the_book_that_was_grabbed()
        {
            // Live case: this release was grabbed for Ruins, but its files were identified as Pathfinder
            // (book 1 of the same series) and replaced Pathfinder's files. Re-parsing the title can map the
            // tracked download to Pathfinder too, so only the grab history says what was grabbed.
            _trackedDownload.DownloadItem.Title = "Orson Scott Card - Ruins Pathfinder, Book 2 (Unabridged) MP3";
            var ruins = GivenBookInLibrary(57560, "Ruins");
            var pathfinder = GivenBookInLibrary(57546, "Pathfinder");
            _trackedDownload.RemoteBook.Books = new List<Book> { pathfinder };

            GivenGrabs(Grab(ruins.Id, DateTime.UtcNow));

            ImportAndGetPinnedBook().Should().Be(ruins);
        }

        [Test]
        public void should_pin_the_book_from_the_latest_grab_of_a_reused_download()
        {
            // Live case: one torrent hash was grabbed for Firebrand, then Green Rider, then Firebrand again
            var greenRider = GivenBookInLibrary(5320, "Green Rider");
            var firebrand = GivenBookInLibrary(5322, "Firebrand");
            _trackedDownload.RemoteBook.Books = new List<Book> { greenRider };

            GivenGrabs(Grab(firebrand.Id, DateTime.UtcNow.AddDays(-700), "Kristen Britain - Firebrand (Unabridged)"),
                       Grab(greenRider.Id, DateTime.UtcNow.AddDays(-4), "Firebrand: Green Rider, Book 6 - Kristen Britain [MP3] [64 Kbps]"),
                       Grab(firebrand.Id, DateTime.UtcNow, "Firebrand: Green Rider, Book 6 - Kristen Britain [MP3] [64 Kbps]"));

            ImportAndGetPinnedBook().Should().Be(firebrand);
        }

        [Test]
        public void should_require_manual_import_when_the_grabbed_book_is_gone()
        {
            // Matching the files freely could put Ruins over Pathfinder again
            var pathfinder = GivenBookInLibrary(57546, "Pathfinder");
            _trackedDownload.RemoteBook.Books = new List<Book> { pathfinder };

            Mocker.GetMock<IBookService>()
                  .Setup(s => s.GetBook(57560))
                  .Throws(new ModelNotFoundException(typeof(Book), 57560));

            GivenGrabs(Grab(57560, DateTime.UtcNow));

            Subject.Import(_trackedDownload);

            Mocker.GetMock<IDownloadedBooksImportService>()
                  .Verify(v => v.ProcessPath(It.IsAny<string>(), It.IsAny<ImportMode>(), It.IsAny<Author>(), It.IsAny<DownloadClientItem>(), It.IsAny<Book>()), Times.Never());

            _trackedDownload.State.Should().Be(TrackedDownloadState.ImportFailed);
            _trackedDownload.StatusMessages.SelectMany(x => x.Messages).Should().Contain(x => x.Contains("manual import required"));
        }

        [Test]
        public void should_require_manual_import_when_the_grabbed_book_moved_to_another_author()
        {
            var ruins = GivenBookInLibrary(57560, "Ruins");
            ruins.AuthorMetadataId = 999;

            GivenGrabs(Grab(ruins.Id, DateTime.UtcNow));

            Subject.Import(_trackedDownload);

            Mocker.GetMock<IDownloadedBooksImportService>()
                  .Verify(v => v.ProcessPath(It.IsAny<string>(), It.IsAny<ImportMode>(), It.IsAny<Author>(), It.IsAny<DownloadClientItem>(), It.IsAny<Book>()), Times.Never());

            _trackedDownload.State.Should().Be(TrackedDownloadState.ImportFailed);
        }

        [Test]
        public void should_not_pin_a_book_without_grab_history()
        {
            _trackedDownload.RemoteBook.Books = new List<Book> { GivenBookInLibrary(57546, "Pathfinder") };

            GivenGrabs();

            ImportAndGetPinnedBook().Should().BeNull();
        }

        [Test]
        public void should_not_pin_a_book_when_the_download_was_grabbed_for_several()
        {
            var now = DateTime.UtcNow;
            var one = GivenBookInLibrary(1, "One");
            var two = GivenBookInLibrary(2, "Two");
            _trackedDownload.RemoteBook.Books = new List<Book> { one };

            GivenGrabs(Grab(one.Id, now), Grab(two.Id, now.AddMilliseconds(3)));

            ImportAndGetPinnedBook().Should().BeNull();
        }

        private static string AutumnRepublicFolder => @"C:\DropFolder\Brian McClellan - The Autumn Republic - Book Three of the Powder Mage Trilogy (2015) MP3".AsOsAgnostic();

        private Book GivenTheAutumnRepublic(int partsInLibrary)
        {
            var book = new Book { Id = AutumnRepublicId, ForeignBookId = "40224712", Title = "The Autumn Republic" };

            _trackedDownload.RemoteBook.Books = new List<Book> { book };

            Mocker.GetMock<IMediaFileService>()
                  .Setup(s => s.GetFilesByBook(AutumnRepublicId))
                  .Returns(Enumerable.Range(1, partsInLibrary)
                      .Select(i => new BookFile { Part = i, Path = $"/books/Brian McClellan/The Autumn Republic/The Autumn Republic ({i}).mp3" })
                      .ToList());

            return book;
        }

        private ImportResult GivenPart(Book book, int number, params string[] errors)
        {
            return new ImportResult(new ImportDecision<LocalBook>(new LocalBook
            {
                Path = Path.Combine(AutumnRepublicFolder, $"BMAR{number:00}-56 Brian McClellan - The Autumn Republic.mp3"),
                Book = book,
                Author = _author,
                PartCount = 56
            }), errors);
        }

        private ImportResult GivenRejectedFile(Book book, string fileName, string reason)
        {
            return new ImportResult(new ImportDecision<LocalBook>(new LocalBook
            {
                Path = Path.Combine(AutumnRepublicFolder, fileName),
                Book = book,
                Author = _author,
                PartCount = 56
            }, new Rejection(reason)), reason);
        }

        private void GivenResults(List<ImportResult> results)
        {
            Mocker.GetMock<IDownloadedBooksImportService>()
                  .Setup(v => v.ProcessPath(It.IsAny<string>(), It.IsAny<ImportMode>(), It.IsAny<Author>(), It.IsAny<DownloadClientItem>(), It.IsAny<Book>()))
                  .Returns(results);
        }

        private void GivenHistorySaysImported()
        {
            var history = Builder<EntityHistory>.CreateListOfSize(55)
                .All()
                .With(x => x.EventType = EntityHistoryEventType.BookFileImported)
                .With(x => x.BookId = AutumnRepublicId)
                .BuildList();

            Mocker.GetMock<IHistoryService>()
                  .Setup(s => s.FindByDownloadId(It.IsAny<string>()))
                  .Returns(history);

            Mocker.GetMock<ITrackedDownloadAlreadyImported>()
                  .Setup(s => s.IsImported(It.IsAny<TrackedDownload>(), It.IsAny<List<EntityHistory>>()))
                  .Returns(true);
        }

        // Live case, The Autumn Republic on 2026-10-09: 55 of 56 parts imported and BMAR01 was skipped as a
        // duplicate part. The download was marked imported, so SABnzbd's remove-completed deleted BMAR01.
        private List<ImportResult> GivenBmar01Skipped()
        {
            var book = GivenTheAutumnRepublic(55);
            var results = Enumerable.Range(2, 55).Select(i => GivenPart(book, i)).ToList();

            results.Add(GivenPart(book, 1, "Book has already been imported"));
            GivenResults(results);

            return results;
        }

        [Test]
        public void should_not_mark_as_imported_when_a_part_of_the_book_was_left_behind()
        {
            GivenBmar01Skipped();

            Subject.Import(_trackedDownload);

            AssertNotImported();
            _trackedDownload.Status.Should().Be(TrackedDownloadStatus.Warning);
            _trackedDownload.StatusMessages.Should().Contain(m => m.Title == "BMAR01-56 Brian McClellan - The Autumn Republic.mp3");

            Mocker.GetMock<IEventAggregator>()
                  .Verify(v => v.PublishEvent(It.IsAny<BookImportIncompleteEvent>()), Times.Once());

            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_not_mark_as_imported_from_history_when_a_part_of_the_book_was_left_behind()
        {
            GivenBmar01Skipped();
            GivenHistorySaysImported();

            Subject.Import(_trackedDownload);

            AssertNotImported();

            ExceptionVerification.ExpectedWarns(1);
        }

        [TestCase(ImportApprovedBooks.ConflictingPartsReason)]
        [TestCase("Failed to add missing book")]
        public void should_not_verify_an_external_scan_as_imported_when_a_part_was_rejected_as_not_imported(string reason)
        {
            var book = GivenTheAutumnRepublic(55);
            var results = Enumerable.Range(2, 55).Select(i => GivenPart(book, i)).ToList();
            var rejection = reason == "Failed to add missing book" ? new Rejection(reason, RejectionType.Temporary) : new Rejection(reason);

            results.Add(new ImportResult(new ImportDecision<LocalBook>(GivenPart(book, 1).ImportDecision.Item, rejection), reason));

            Subject.VerifyImport(_trackedDownload, results).Should().BeFalse();

            _trackedDownload.State.Should().NotBe(TrackedDownloadState.Imported);

            ExceptionVerification.ExpectedWarns(1);
        }

        [TestCase("Not an upgrade for existing book file(s)")]
        [TestCase("Book match is not close enough: 61.2% vs 80% edition")]
        [TestCase("Has the same filesize as existing file")]
        public void should_mark_as_imported_when_only_a_preview_or_other_edition_of_the_book_was_rejected(string reason)
        {
            var book = GivenTheAutumnRepublic(56);
            var results = Enumerable.Range(1, 56).Select(i => GivenPart(book, i)).ToList();

            results.Add(GivenRejectedFile(book, "Brian McClellan - The Autumn Republic (Preview).mp3", reason));
            GivenResults(results);

            Subject.Import(_trackedDownload);

            AssertImported();
        }

        [Test]
        public void should_mark_as_imported_when_only_a_file_that_is_not_audio_was_left_behind()
        {
            var book = GivenTheAutumnRepublic(56);
            var results = Enumerable.Range(1, 56).Select(i => GivenPart(book, i)).ToList();

            results.Add(new ImportResult(new ImportDecision<LocalBook>(new LocalBook { Path = Path.Combine(AutumnRepublicFolder, "Brian McClellan - The Autumn Republic.pdf"), Book = book, Author = _author }), "Book has already been imported"));
            GivenResults(results);

            Subject.Import(_trackedDownload);

            AssertImported();
        }

        // The first attempt moved 30 parts and stopped. The rescan imports nothing and rejects the other 26 as
        // already imported, because history has this download's imports.
        private void GivenARescanAfterAPartialMove(int partsInLibrary)
        {
            var book = GivenTheAutumnRepublic(partsInLibrary);
            var reason = AlreadyImportedSpecification.AlreadyImportedReason + " 10/09/2026 10:23:54";

            GivenResults(Enumerable.Range(31, 26)
                .Select(i => new ImportResult(new ImportDecision<LocalBook>(GivenPart(book, i).ImportDecision.Item, new Rejection(reason)), reason))
                .ToList());

            GivenHistorySaysImported();
        }

        [Test]
        public void should_not_mark_as_imported_when_a_rescan_after_a_partial_move_rejects_the_rest_as_already_imported()
        {
            GivenARescanAfterAPartialMove(30);

            Subject.Import(_trackedDownload);

            AssertNotImported();

            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_mark_as_imported_when_a_rescan_finds_every_part_already_in_the_library()
        {
            GivenARescanAfterAPartialMove(56);

            Subject.Import(_trackedDownload);

            _trackedDownload.State.Should().Be(TrackedDownloadState.Imported);
        }

        private void AssertNotImported()
        {
            Mocker.GetMock<IEventAggregator>()
                  .Verify(v => v.PublishEvent(It.IsAny<DownloadCompletedEvent>()), Times.Never());

            _trackedDownload.State.Should().Be(TrackedDownloadState.ImportFailed);
        }

        private void AssertImported()
        {
            Mocker.GetMock<IDownloadedBooksImportService>()
                .Verify(v => v.ProcessPath(_trackedDownload.DownloadItem.OutputPath.FullPath, ImportMode.Auto, _trackedDownload.RemoteBook.Author, _trackedDownload.DownloadItem, It.IsAny<Book>()), Times.Once());

            Mocker.GetMock<IEventAggregator>()
                  .Verify(v => v.PublishEvent(It.IsAny<DownloadCompletedEvent>()), Times.Once());

            _trackedDownload.State.Should().Be(TrackedDownloadState.Imported);
        }
    }
}
