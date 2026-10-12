using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using FizzWare.NBuilder;
using FluentAssertions;
using Moq;
using Newtonsoft.Json;
using NUnit.Framework;
using NzbDrone.Common.Extensions;
using NzbDrone.Common.Http;
using NzbDrone.Core.Books;
using NzbDrone.Core.Books.Commands;
using NzbDrone.Core.Books.Events;
using NzbDrone.Core.Exceptions;
using NzbDrone.Core.History;
using NzbDrone.Core.Http;
using NzbDrone.Core.ImportLists.Exclusions;
using NzbDrone.Core.MediaFiles;
using NzbDrone.Core.MetadataSource;
using NzbDrone.Core.MetadataSource.BookInfo;
using NzbDrone.Core.Profiles.Metadata;
using NzbDrone.Core.RootFolders;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.MusicTests
{
    [TestFixture]
    public class RefreshAuthorServiceFixture : CoreTest<RefreshAuthorService>
    {
        private Author _author;
        private Book _book1;
        private Book _book2;
        private List<Book> _books;
        private List<Book> _remoteBooks;

        [SetUp]
        public void Setup()
        {
            _book1 = Builder<Book>.CreateNew()
                .With(s => s.ForeignBookId = "1")
                .Build();

            _book2 = Builder<Book>.CreateNew()
                .With(s => s.ForeignBookId = "2")
                .Build();

            _books = new List<Book> { _book1, _book2 };

            _remoteBooks = _books.JsonClone();
            _remoteBooks.ForEach(x => x.Id = 0);

            var metadata = Builder<AuthorMetadata>.CreateNew().Build();
            var series = Builder<Series>.CreateListOfSize(1).BuildList();
            var profile = Builder<MetadataProfile>.CreateNew().Build();

            _author = Builder<Author>.CreateNew()
                .With(a => a.Metadata = metadata)
                .With(a => a.Series = series)
                .With(a => a.MetadataProfile = profile)
                .Build();

            Mocker.GetMock<IAuthorService>(MockBehavior.Strict)
                  .Setup(s => s.GetAuthors(new List<int> { _author.Id }))
                  .Returns(new List<Author> { _author });

            Mocker.GetMock<IBookService>(MockBehavior.Strict)
                .Setup(s => s.InsertMany(It.IsAny<List<Book>>()));

            Mocker.GetMock<IMetadataProfileService>()
                .Setup(s => s.FilterBooks(It.IsAny<Author>(), It.IsAny<int>()))
                .Returns(_remoteBooks);

            Mocker.GetMock<IProvideAuthorInfo>()
                .Setup(s => s.GetAuthorInfo(It.IsAny<string>(), true))
                .Callback(() => { throw new AuthorNotFoundException(_author.ForeignAuthorId); });

            Mocker.GetMock<IMediaFileService>()
                .Setup(x => x.GetFilesByAuthor(It.IsAny<int>()))
                .Returns(new List<BookFile>());

            Mocker.GetMock<IHistoryService>()
                .Setup(x => x.GetByAuthor(It.IsAny<int>(), It.IsAny<EntityHistoryEventType?>()))
                .Returns(new List<EntityHistory>());

            Mocker.GetMock<IImportListExclusionService>()
                .Setup(x => x.FindByForeignId(It.IsAny<List<string>>()))
                .Returns(new List<ImportListExclusion>());

            Mocker.GetMock<IRootFolderService>()
                .Setup(x => x.All())
                .Returns(new List<RootFolder>());

            Mocker.GetMock<IMonitorNewBookService>()
                .Setup(x => x.ShouldMonitorNewBook(It.IsAny<Book>(), It.IsAny<List<Book>>(), It.IsAny<NewItemMonitorTypes>()))
                .Returns(true);
        }

        private void GivenNewAuthorInfo(Author author)
        {
            Mocker.GetMock<IProvideAuthorInfo>()
                .Setup(s => s.GetAuthorInfo(_author.ForeignAuthorId, true))
                .Returns(author);
        }

        private void GivenAuthorFiles()
        {
            Mocker.GetMock<IMediaFileService>()
                  .Setup(x => x.GetFilesByAuthor(It.IsAny<int>()))
                  .Returns(Builder<BookFile>.CreateListOfSize(1).BuildList());
        }

        private void GivenBooksForRefresh(List<Book> books)
        {
            Mocker.GetMock<IBookService>(MockBehavior.Strict)
                .Setup(s => s.GetBooksForRefresh(It.IsAny<int>(), It.IsAny<List<string>>()))
                .Returns(books);
        }

        private void AllowAuthorUpdate()
        {
            Mocker.GetMock<IAuthorService>(MockBehavior.Strict)
                .Setup(x => x.UpdateAuthor(It.IsAny<Author>()))
                .Returns((Author a) => a);
        }

        [Test]
        public void should_change_nothing_when_metadata_source_is_down_and_only_a_cached_answer_exists()
        {
            _author.Metadata.Value.ForeignAuthorId = "123";
            GivenBooksForRefresh(_books);
            AllowAuthorUpdate();

            Mocker.GetMock<IAuthorService>(MockBehavior.Strict)
                .Setup(s => s.FindById("123"))
                .Returns(_author);

            Mocker.GetMock<IMetadataRequestBuilder>()
                .Setup(s => s.GetRequestBuilder())
                .Returns(new HttpRequestBuilder("http://metadata.test/{route}").CreateFactory());

            // A last good answer from before the outage, with fewer works than the library has now
            Mocker.GetMock<ICachedHttpResponseRepository>()
                .Setup(s => s.FindByUrl("http://metadata.test/author/123"))
                .Returns(new CachedHttpResponse
                {
                    Url = "http://metadata.test/author/123",
                    Value = "{\"ForeignId\":123,\"Name\":\"Old Snapshot\",\"Works\":[],\"Series\":[]}",
                    StatusCode = 200,
                    LastRefresh = DateTime.UtcNow.AddDays(-3),
                    Expiry = DateTime.UtcNow.AddDays(-3).AddMinutes(30)
                });

            Mocker.GetMock<IHttpClient>()
                .Setup(s => s.Get(It.IsAny<HttpRequest>()))
                .Returns<HttpRequest>(r => new HttpResponse(r, new HttpHeader(), "upstream down", HttpStatusCode.ServiceUnavailable));

            Mocker.SetConstant<ICachedHttpResponseService>(Mocker.Resolve<CachedHttpResponseService>());
            Mocker.SetConstant<IProvideAuthorInfo>(Mocker.Resolve<BookInfoProxy>());

            Subject.Execute(new RefreshAuthorCommand(_author.Id));

            // The old snapshot never reaches the refresh: no metadata written, no merge, no book refresh
            Mocker.GetMock<IAuthorMetadataService>()
                .Verify(v => v.UpsertMany(It.IsAny<List<AuthorMetadata>>()), Times.Never());
            Mocker.GetMock<IAuthorService>()
                .Verify(v => v.FindById(It.IsAny<string>()), Times.Never());
            Mocker.GetMock<IBookService>()
                .Verify(v => v.GetBooksForRefresh(It.IsAny<int>(), It.IsAny<List<string>>()), Times.Never());
            Mocker.GetMock<IAuthorService>()
                .Verify(v => v.UpdateAuthor(It.IsAny<Author>()), Times.Never());
            Mocker.GetMock<IAuthorService>()
                .Verify(v => v.DeleteAuthor(It.IsAny<int>(), It.IsAny<bool>(), It.IsAny<bool>()), Times.Never());

            ExceptionVerification.ExpectedErrors(1);
            ExceptionVerification.ExpectedWarns(2);
        }

        [Test]
        public void should_leave_remaining_authors_alone_once_the_retry_budget_is_spent()
        {
            var authors = Builder<Author>.CreateListOfSize(3)
                .All()
                .With(a => a.Metadata = Builder<AuthorMetadata>.CreateNew().Build())
                .Build()
                .ToList();

            Mocker.GetMock<IAuthorService>(MockBehavior.Strict)
                .Setup(s => s.GetAuthors(It.IsAny<List<int>>()))
                .Returns(authors);

            // The first author's lookup waits out the whole budget and still fails
            Mocker.GetMock<IProvideAuthorInfo>()
                .Setup(s => s.GetAuthorInfo(It.IsAny<string>(), true))
                .Callback(() => MetadataRetryBudget.TrySpend(TimeSpan.FromHours(1)))
                .Throws(new BookInfoException("BookInfo returned 429"));

            Subject.Execute(new BulkRefreshAuthorCommand(authors.Select(a => a.Id).ToList()));

            Mocker.GetMock<IProvideAuthorInfo>()
                .Verify(v => v.GetAuthorInfo(It.IsAny<string>(), true), Times.Once());
            Mocker.GetMock<IAuthorService>()
                .Verify(v => v.DeleteAuthor(It.IsAny<int>(), It.IsAny<bool>(), It.IsAny<bool>()), Times.Never());

            ExceptionVerification.ExpectedErrors(1);
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_refresh_on_schedule_when_changed_authors_cannot_be_fetched()
        {
            Mocker.GetMock<IAuthorService>(MockBehavior.Strict)
                .Setup(s => s.GetAllAuthors())
                .Returns(new List<Author> { _author });

            // A 502 page or plain-text error where JSON was expected
            Mocker.GetMock<IProvideAuthorInfo>()
                .Setup(s => s.GetChangedAuthors(It.IsAny<DateTime>()))
                .Throws(new JsonException("Unexpected character encountered while parsing value: <"));

            var command = new RefreshAuthorCommand
            {
                LastExecutionTime = DateTime.UtcNow.AddHours(-12),
                LastStartTime = DateTime.UtcNow.AddHours(-12)
            };

            Subject.Execute(command);

            Mocker.GetMock<ICheckIfAuthorShouldBeRefreshed>()
                .Verify(v => v.ShouldRefresh(_author), Times.Once());
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_not_publish_author_updated_event_if_metadata_not_updated()
        {
            var newAuthorInfo = _author.JsonClone();
            newAuthorInfo.Metadata = _author.Metadata.Value.JsonClone();
            newAuthorInfo.Books = _remoteBooks;

            GivenNewAuthorInfo(newAuthorInfo);
            GivenBooksForRefresh(_books);
            AllowAuthorUpdate();

            Subject.Execute(new RefreshAuthorCommand(_author.Id));

            VerifyEventNotPublished<AuthorUpdatedEvent>();
            VerifyEventPublished<AuthorRefreshCompleteEvent>();
        }

        [Test]
        public void should_publish_author_updated_event_if_metadata_updated()
        {
            var newAuthorInfo = _author.JsonClone();
            newAuthorInfo.Metadata = _author.Metadata.Value.JsonClone();
            newAuthorInfo.Metadata.Value.Images = new List<MediaCover.MediaCover>
            {
                new MediaCover.MediaCover(MediaCover.MediaCoverTypes.Logo, "dummy")
            };
            newAuthorInfo.Books = _remoteBooks;

            GivenNewAuthorInfo(newAuthorInfo);
            GivenBooksForRefresh(new List<Book>());
            AllowAuthorUpdate();

            Subject.Execute(new RefreshAuthorCommand(_author.Id));

            VerifyEventPublished<AuthorUpdatedEvent>();
            VerifyEventPublished<AuthorRefreshCompleteEvent>();
        }

        [Test]
        public void should_call_new_book_monitor_service_when_adding_book()
        {
            var newBook = Builder<Book>.CreateNew()
                .With(x => x.Id = 0)
                .With(x => x.ForeignBookId = "3")
                .Build();
            _remoteBooks.Add(newBook);

            var newAuthorInfo = _author.JsonClone();
            newAuthorInfo.Metadata = _author.Metadata.Value.JsonClone();
            newAuthorInfo.Books = _remoteBooks;

            GivenNewAuthorInfo(newAuthorInfo);
            GivenBooksForRefresh(_books);
            AllowAuthorUpdate();

            Subject.Execute(new RefreshAuthorCommand(_author.Id));

            Mocker.GetMock<IMonitorNewBookService>()
                .Verify(x => x.ShouldMonitorNewBook(newBook, _books, _author.MonitorNewItems), Times.Once());
        }

        [Test]
        public void should_sum_up_the_books_a_refresh_keeps_in_one_warn()
        {
            var newAuthorInfo = _author.JsonClone();
            newAuthorInfo.Metadata = _author.Metadata.Value.JsonClone();
            newAuthorInfo.Books = _remoteBooks;

            GivenNewAuthorInfo(newAuthorInfo);
            GivenBooksForRefresh(_books);
            AllowAuthorUpdate();

            Mocker.GetMock<IRefreshBookService>()
                .Setup(s => s.RefreshBookInfo(It.IsAny<List<Book>>(), It.IsAny<List<Book>>(), It.IsAny<Author>(), It.IsAny<bool>(), It.IsAny<bool>(), It.IsAny<DateTime?>()))
                .Callback((List<Book> books, List<Book> remote, Author data, bool force, bool tags, DateTime? lastUpdate) =>
                    books.ForEach(b => KeptBooks.NotFound(b, TestLogger)))
                .Returns(false);

            Subject.Execute(new RefreshAuthorCommand(_author.Id));

            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_log_error_but_not_delete_if_author_not_found_and_author_has_no_files()
        {
            Mocker.GetMock<IAuthorService>()
                .Setup(x => x.DeleteAuthor(It.IsAny<int>(), It.IsAny<bool>(), It.IsAny<bool>()));

            Subject.Execute(new RefreshAuthorCommand(_author.Id));

            Mocker.GetMock<IAuthorService>()
                .Verify(v => v.UpdateAuthor(It.IsAny<Author>()), Times.Never());

            Mocker.GetMock<IAuthorService>()
                .Verify(v => v.DeleteAuthor(It.IsAny<int>(), It.IsAny<bool>(), It.IsAny<bool>()), Times.Never());

            ExceptionVerification.ExpectedErrors(1);
        }

        [Test]
        public void should_log_error_but_not_delete_if_musicbrainz_id_not_found_and_author_has_files()
        {
            GivenAuthorFiles();
            GivenBooksForRefresh(new List<Book>());

            Subject.Execute(new RefreshAuthorCommand(_author.Id));

            Mocker.GetMock<IAuthorService>()
                .Verify(v => v.UpdateAuthor(It.IsAny<Author>()), Times.Never());

            Mocker.GetMock<IAuthorService>()
                .Verify(v => v.DeleteAuthor(It.IsAny<int>(), It.IsAny<bool>(), It.IsAny<bool>()), Times.Never());

            ExceptionVerification.ExpectedErrors(1);
        }

        [Test]
        public void should_update_if_musicbrainz_id_changed_and_no_clash()
        {
            var newAuthorInfo = _author.JsonClone();
            newAuthorInfo.Metadata = _author.Metadata.Value.JsonClone();
            newAuthorInfo.Books = _remoteBooks;
            newAuthorInfo.ForeignAuthorId = _author.ForeignAuthorId + 1;
            newAuthorInfo.Metadata.Value.Id = 100;

            GivenNewAuthorInfo(newAuthorInfo);

            var seq = new MockSequence();

            Mocker.GetMock<IAuthorService>(MockBehavior.Strict)
                .Setup(x => x.FindById(newAuthorInfo.ForeignAuthorId))
                .Returns(default(Author));

            // Make sure that the author is updated before we refresh the books
            Mocker.GetMock<IAuthorService>(MockBehavior.Strict)
                .InSequence(seq)
                .Setup(x => x.UpdateAuthor(It.IsAny<Author>()))
                .Returns((Author a) => a);

            Mocker.GetMock<IBookService>(MockBehavior.Strict)
                .InSequence(seq)
                .Setup(x => x.GetBooksForRefresh(It.IsAny<int>(), It.IsAny<List<string>>()))
                .Returns(new List<Book>());

            // Update called twice for a move/merge
            Mocker.GetMock<IAuthorService>(MockBehavior.Strict)
                .InSequence(seq)
                .Setup(x => x.UpdateAuthor(It.IsAny<Author>()))
                .Returns((Author a) => a);

            Subject.Execute(new RefreshAuthorCommand(_author.Id));

            Mocker.GetMock<IAuthorService>()
                .Verify(v => v.UpdateAuthor(It.Is<Author>(s => s.AuthorMetadataId == 100 && s.ForeignAuthorId == newAuthorInfo.ForeignAuthorId)),
                        Times.Exactly(2));
        }

        [Test]
        public void should_merge_if_musicbrainz_id_changed_and_new_id_already_exists()
        {
            var existing = _author;

            var clash = _author.JsonClone();
            clash.Id = 100;
            clash.Metadata = existing.Metadata.Value.JsonClone();
            clash.Metadata.Value.Id = 101;
            clash.Metadata.Value.ForeignAuthorId = clash.Metadata.Value.ForeignAuthorId + 1;

            Mocker.GetMock<IAuthorService>(MockBehavior.Strict)
                .Setup(x => x.FindById(clash.Metadata.Value.ForeignAuthorId))
                .Returns(clash);

            var newAuthorInfo = clash.JsonClone();
            newAuthorInfo.Metadata = clash.Metadata.Value.JsonClone();
            newAuthorInfo.Books = _remoteBooks;

            GivenNewAuthorInfo(newAuthorInfo);

            var seq = new MockSequence();

            // Make sure that the author is updated before we refresh the books
            Mocker.GetMock<IBookService>(MockBehavior.Strict)
                .InSequence(seq)
                .Setup(x => x.GetBooksByAuthor(existing.Id))
                .Returns(_books);

            Mocker.GetMock<IBookService>(MockBehavior.Strict)
                .InSequence(seq)
                .Setup(x => x.UpdateMany(It.IsAny<List<Book>>()));

            Mocker.GetMock<IAuthorService>(MockBehavior.Strict)
                .InSequence(seq)
                .Setup(x => x.DeleteAuthor(existing.Id, It.IsAny<bool>(), false));

            Mocker.GetMock<IAuthorService>(MockBehavior.Strict)
                .InSequence(seq)
                .Setup(x => x.UpdateAuthor(It.Is<Author>(a => a.Id == clash.Id)))
                .Returns((Author a) => a);

            Mocker.GetMock<IBookService>(MockBehavior.Strict)
                .InSequence(seq)
                .Setup(x => x.GetBooksForRefresh(clash.AuthorMetadataId, It.IsAny<List<string>>()))
                .Returns(_books);

            // Update called twice for a move/merge
            Mocker.GetMock<IAuthorService>(MockBehavior.Strict)
                .InSequence(seq)
                .Setup(x => x.UpdateAuthor(It.IsAny<Author>()))
                .Returns((Author a) => a);

            Subject.Execute(new RefreshAuthorCommand(_author.Id));

            // the retained author gets updated
            Mocker.GetMock<IAuthorService>()
                .Verify(v => v.UpdateAuthor(It.Is<Author>(s => s.Id == clash.Id)), Times.Exactly(2));

            // the old one gets removed
            Mocker.GetMock<IAuthorService>()
                .Verify(v => v.DeleteAuthor(existing.Id, false, false));

            Mocker.GetMock<IBookService>()
                .Verify(v => v.UpdateMany(It.Is<List<Book>>(x => x.Count == _books.Count)));

            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_move_history_to_the_retained_author_before_deleting_the_duplicate()
        {
            var existing = _author;

            var clash = _author.JsonClone();
            clash.Id = 100;
            clash.Metadata = existing.Metadata.Value.JsonClone();
            clash.Metadata.Value.Id = 101;
            clash.Metadata.Value.ForeignAuthorId = clash.Metadata.Value.ForeignAuthorId + 1;

            var newAuthorInfo = clash.JsonClone();
            newAuthorInfo.Metadata = clash.Metadata.Value.JsonClone();
            newAuthorInfo.Books = _remoteBooks;

            GivenNewAuthorInfo(newAuthorInfo);

            // History rows live in a list behind the real HistoryService
            var history = Builder<EntityHistory>.CreateListOfSize(3)
                .All()
                .With(h => h.AuthorId = existing.Id)
                .BuildList();

            var historyRepository = Mocker.GetMock<IHistoryRepository>();
            historyRepository.Setup(x => x.GetByAuthor(It.IsAny<int>(), It.IsAny<EntityHistoryEventType?>()))
                .Returns((int authorId, EntityHistoryEventType? type) => history.Where(h => h.AuthorId == authorId).ToList());
            historyRepository.Setup(x => x.DeleteForAuthor(It.IsAny<int>()))
                .Callback((int authorId) => history.RemoveAll(h => h.AuthorId == authorId));

            var historyService = Mocker.Resolve<HistoryService>();
            Mocker.SetConstant<IHistoryService>(historyService);

            Mocker.GetMock<IAuthorService>(MockBehavior.Strict)
                .Setup(x => x.FindById(clash.Metadata.Value.ForeignAuthorId))
                .Returns(clash);

            Mocker.GetMock<IBookService>(MockBehavior.Strict)
                .Setup(x => x.GetBooksByAuthor(existing.Id))
                .Returns(_books);

            Mocker.GetMock<IBookService>(MockBehavior.Strict)
                .Setup(x => x.UpdateMany(It.IsAny<List<Book>>()));

            Mocker.GetMock<IBookService>(MockBehavior.Strict)
                .Setup(x => x.GetBooksForRefresh(clash.AuthorMetadataId, It.IsAny<List<string>>()))
                .Returns(_books);

            AllowAuthorUpdate();

            // DeleteAuthor publishes AuthorDeletedEvent, and HistoryService handles it synchronously
            Mocker.GetMock<IAuthorService>(MockBehavior.Strict)
                .Setup(x => x.DeleteAuthor(existing.Id, It.IsAny<bool>(), false))
                .Callback((int id, bool deleteFiles, bool addExclusion) => historyService.Handle(new AuthorDeletedEvent(existing, deleteFiles, addExclusion)));

            Subject.Execute(new RefreshAuthorCommand(_author.Id));

            history.Should().HaveCount(3);
            history.Should().OnlyContain(h => h.AuthorId == clash.Id);

            ExceptionVerification.ExpectedWarns(1);
        }
    }
}
