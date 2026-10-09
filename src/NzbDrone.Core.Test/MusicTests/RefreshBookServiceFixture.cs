using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web;
using FizzWare.NBuilder;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Http;
using NzbDrone.Core.Books;
using NzbDrone.Core.Books.Commands;
using NzbDrone.Core.Exceptions;
using NzbDrone.Core.Http;
using NzbDrone.Core.MediaFiles;
using NzbDrone.Core.MetadataSource;
using NzbDrone.Core.MetadataSource.BookInfo;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.MusicTests
{
    [TestFixture]
    public class RefreshBookServiceFixture : CoreTest<RefreshBookService>
    {
        private Author _author;
        private Book _book;

        [SetUp]
        public void Setup()
        {
            var metadata = Builder<AuthorMetadata>.CreateNew().Build();

            _author = Builder<Author>.CreateNew()
                .With(a => a.Metadata = metadata)
                .Build();

            _book = Builder<Book>.CreateNew()
                .With(b => b.ForeignBookId = "1")
                .With(b => b.AuthorMetadata = metadata)
                .With(b => b.Author = _author)
                .With(b => b.AddOptions = new AddBookOptions { AddType = BookAddType.Automatic })
                .Build();

            Mocker.GetMock<IMediaFileService>()
                .Setup(s => s.GetFilesByBook(It.IsAny<int>()))
                .Returns(new List<BookFile>());

            Mocker.GetMock<IAuthorService>()
                .Setup(s => s.FindById(It.IsAny<string>()))
                .Returns(_author);

            Mocker.GetMock<IEditionService>()
                .Setup(s => s.GetEditionsForRefresh(It.IsAny<int>(), It.IsAny<List<string>>()))
                .Returns(new List<Edition>());

            Mocker.GetMock<IEditionService>()
                .Setup(s => s.GetEditionsByBook(It.IsAny<int>()))
                .Returns(new List<Edition>());
        }

        private void GivenBookLookupReturnsBook(string foreignBookId = null)
        {
            var remoteAuthor = Builder<Author>.CreateNew()
                .With(a => a.Metadata = Builder<AuthorMetadata>.CreateNew().Build())
                .Build();

            var remoteBook = Builder<Book>.CreateNew()
                .With(b => b.Id = 0)
                .With(b => b.ForeignBookId = foreignBookId ?? _book.ForeignBookId)
                .With(b => b.Editions = Builder<Edition>.CreateListOfSize(1)
                          .All()
                          .With(e => e.Id = 0)
                          .With(e => e.Monitored = true)
                          .BuildList())
                .Build();

            Mocker.GetMock<IProvideBookInfo>()
                .Setup(s => s.GetBookInfo(_book.ForeignBookId))
                .Returns(Tuple.Create(remoteAuthor.ForeignAuthorId, remoteBook, new List<AuthorMetadata> { remoteAuthor.Metadata.Value }));

            Mocker.GetMock<IProvideAuthorInfo>()
                .Setup(s => s.GetAuthorInfo(remoteAuthor.ForeignAuthorId, It.IsAny<bool>()))
                .Returns(remoteAuthor);
        }

        private Edition GivenLocalEdition(int id, bool monitored, bool hasFiles)
        {
            var edition = Builder<Edition>.CreateNew()
                .With(e => e.Id = id)
                .With(e => e.BookId = _book.Id)
                .With(e => e.ForeignEditionId = id.ToString())
                .With(e => e.Monitored = monitored)
                .Build();

            Mocker.GetMock<IMediaFileService>()
                .Setup(s => s.GetFilesByEdition(id))
                .Returns(hasFiles ? Builder<BookFile>.CreateListOfSize(1).All().With(f => f.EditionId = id).BuildList() : new List<BookFile>());

            return edition;
        }

        private void RefreshWithRemoteEditions(List<Edition> localEditions, List<Edition> remoteEditions)
        {
            var remoteBook = Builder<Book>.CreateNew()
                .With(b => b.Id = 0)
                .With(b => b.ForeignBookId = _book.ForeignBookId)
                .With(b => b.AuthorMetadata = _book.AuthorMetadata.Value)
                .With(b => b.Editions = remoteEditions)
                .Build();

            Mocker.GetMock<IEditionService>()
                .Setup(s => s.GetEditionsForRefresh(_book.Id, It.IsAny<List<string>>()))
                .Returns(localEditions);

            Mocker.SetConstant<IRefreshEditionService>(Mocker.Resolve<RefreshEditionService>());

            Subject.RefreshBookInfo(_book, new List<Book> { remoteBook }, _author, false);
        }

        private Edition RemoteEdition(string foreignEditionId, bool monitored)
        {
            return Builder<Edition>.CreateNew()
                .With(e => e.Id = 0)
                .With(e => e.ForeignEditionId = foreignEditionId)
                .With(e => e.Monitored = monitored)
                .Build();
        }

        [Test]
        public void should_keep_monitored_edition_with_files_when_metadata_drops_it()
        {
            var withFiles = GivenLocalEdition(1, true, true);
            var withoutFiles = GivenLocalEdition(2, false, false);

            RefreshWithRemoteEditions(new List<Edition> { withFiles, withoutFiles },
                                      new List<Edition> { RemoteEdition("2", false), RemoteEdition("3", true) });

            Mocker.GetMock<IEditionService>()
                .Verify(v => v.DeleteMany(It.Is<List<Edition>>(l => l.Contains(withFiles))), Times.Never());

            withFiles.Monitored.Should().BeTrue();

            Mocker.GetMock<IEditionService>()
                .Verify(v => v.InsertMany(It.Is<List<Edition>>(l => l.Count == 1 && !l[0].Monitored)), Times.Once());

            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_still_delete_edition_without_files_when_metadata_drops_it()
        {
            var withFiles = GivenLocalEdition(1, true, true);
            var withoutFiles = GivenLocalEdition(2, false, false);

            RefreshWithRemoteEditions(new List<Edition> { withFiles, withoutFiles },
                                      new List<Edition> { RemoteEdition("1", true) });

            Mocker.GetMock<IEditionService>()
                .Verify(v => v.DeleteMany(It.Is<List<Edition>>(l => l.Count == 1 && l.Contains(withoutFiles))), Times.Once());
        }

        // An author the metadata credits on the book, with metadata id 2 so a move off _book's id 1 shows up
        private AuthorMetadata GivenCreditedAuthor(string foreignAuthorId, string name, bool inLibrary)
        {
            var metadata = Builder<AuthorMetadata>.CreateNew()
                .With(m => m.Id = 2)
                .With(m => m.ForeignAuthorId = foreignAuthorId)
                .With(m => m.Name = name)
                .Build();

            var credited = Builder<Author>.CreateNew()
                .With(a => a.Id = 2)
                .With(a => a.Metadata = metadata)
                .With(a => a.AuthorMetadataId = 2)
                .Build();

            Mocker.GetMock<IAuthorService>()
                .Setup(s => s.FindById(foreignAuthorId))
                .Returns(inLibrary ? credited : null);

            Mocker.GetMock<IProvideAuthorInfo>()
                .Setup(s => s.GetAuthorInfo(foreignAuthorId, It.IsAny<bool>()))
                .Returns(credited);

            return metadata;
        }

        private void RefreshWithRemoteBookCreditedTo(AuthorMetadata credited)
        {
            var remoteBook = Builder<Book>.CreateNew()
                .With(b => b.Id = 0)
                .With(b => b.ForeignBookId = _book.ForeignBookId)
                .With(b => b.AuthorMetadata = credited)
                .With(b => b.Editions = new List<Edition>())
                .Build();

            Subject.RefreshBookInfo(_book, new List<Book> { remoteBook }, _author, false);
        }

        private void VerifyNoAuthorAdded()
        {
            Mocker.GetMock<IAddAuthorService>()
                .Verify(v => v.AddAuthor(It.IsAny<Author>(), It.IsAny<bool>()), Times.Never());

            Mocker.GetMock<IAddAuthorService>()
                .Verify(v => v.AddAuthors(It.IsAny<List<Author>>(), It.IsAny<bool>()), Times.Never());
        }

        [Test]
        public void should_move_book_to_credited_author_already_in_the_library()
        {
            _book.AuthorMetadataId = 1;
            var credited = GivenCreditedAuthor("123", "Other Author", true);

            RefreshWithRemoteBookCreditedTo(credited);

            _book.AuthorMetadataId.Should().Be(2);
            VerifyNoAuthorAdded();
        }

        [Test]
        public void should_keep_book_under_its_author_when_credited_author_is_not_in_the_library()
        {
            _book.AuthorMetadataId = 1;
            var credited = GivenCreditedAuthor("123", "Other Author", false);

            RefreshWithRemoteBookCreditedTo(credited);

            _book.AuthorMetadataId.Should().Be(1);
            VerifyNoAuthorAdded();

            Mocker.GetMock<IBookService>()
                .Verify(v => v.UpdateMany(It.Is<List<Book>>(l => l.Single() == _book && l.Single().AuthorMetadataId == 1)), Times.AtLeastOnce());

            ExceptionVerification.ExpectedWarns(1);
        }

        // Famous Five 9-10 by Enid Blyton: the work credits its narrator first, so it is missing from Blyton's works
        // list and the book lookup names Jan Francis as its author. Refresh created Jan Francis as a monitored author.
        [Test]
        public void should_not_add_a_narrator_credited_on_a_book_as_an_author()
        {
            _book.AuthorMetadataId = 1;
            var narrator = GivenCreditedAuthor("159221", "Jan Francis", false);

            var remoteBook = Builder<Book>.CreateNew()
                .With(b => b.Id = 0)
                .With(b => b.ForeignBookId = _book.ForeignBookId)
                .With(b => b.Editions = new List<Edition>())
                .Build();

            Mocker.GetMock<IProvideBookInfo>()
                .Setup(s => s.GetBookInfo(_book.ForeignBookId))
                .Returns(Tuple.Create("159221", remoteBook, new List<AuthorMetadata> { narrator }));

            Subject.RefreshBookInfo(new List<Book> { _book }, new List<Book>(), _author, true, false, null);

            VerifyNoAuthorAdded();
            _book.AuthorMetadataId.Should().Be(1);

            Mocker.GetMock<IBookService>()
                .Verify(v => v.DeleteBook(It.IsAny<int>(), It.IsAny<bool>(), It.IsAny<bool>()), Times.Never());

            ExceptionVerification.ExpectedWarns(1);
        }

        private void RefreshWithBookMissingFromAuthorList()
        {
            Subject.RefreshBookInfo(new List<Book> { _book }, new List<Book>(), _author, true, false, null);
        }

        [Test]
        public void should_keep_book_missing_from_author_list_if_book_lookup_still_finds_it()
        {
            GivenBookLookupReturnsBook();

            RefreshWithBookMissingFromAuthorList();

            Mocker.GetMock<IBookService>()
                .Verify(v => v.DeleteBook(It.IsAny<int>(), It.IsAny<bool>(), It.IsAny<bool>()), Times.Never());

            Mocker.GetMock<IBookService>()
                .Verify(v => v.UpdateMany(It.Is<List<Book>>(l => l.Contains(_book))), Times.AtLeastOnce());
        }

        [Test]
        public void should_keep_book_missing_from_author_list_if_book_lookup_finds_it_under_another_id()
        {
            GivenBookLookupReturnsBook("2");

            RefreshWithBookMissingFromAuthorList();

            Mocker.GetMock<IBookService>()
                .Verify(v => v.DeleteBook(It.IsAny<int>(), It.IsAny<bool>(), It.IsAny<bool>()), Times.Never());

            Mocker.GetMock<IBookService>()
                .Verify(v => v.DeleteMany(It.IsAny<List<Book>>()), Times.Never());

            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_delete_book_missing_from_author_list_if_book_lookup_returns_not_found()
        {
            Mocker.GetMock<IProvideBookInfo>()
                .Setup(s => s.GetBookInfo(_book.ForeignBookId))
                .Throws(new BookNotFoundException(_book.ForeignBookId));

            RefreshWithBookMissingFromAuthorList();

            Mocker.GetMock<IProvideBookInfo>()
                .Verify(v => v.GetBookInfo(_book.ForeignBookId), Times.Once());

            Mocker.GetMock<IBookService>()
                .Verify(v => v.DeleteBook(_book.Id, false, false), Times.Once());

            ExceptionVerification.ExpectedErrors(1);
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_keep_book_missing_from_author_list_if_book_lookup_fails()
        {
            Mocker.GetMock<IProvideBookInfo>()
                .Setup(s => s.GetBookInfo(_book.ForeignBookId))
                .Throws(new BookInfoException("Unexpected error fetching book data"));

            RefreshWithBookMissingFromAuthorList();

            Mocker.GetMock<IBookService>()
                .Verify(v => v.DeleteBook(It.IsAny<int>(), It.IsAny<bool>(), It.IsAny<bool>()), Times.Never());

            ExceptionVerification.ExpectedErrors(1);
        }

        private List<Book> GivenBooksMissingFromAuthorList(int count)
        {
            return Enumerable.Range(1, count).Select(i => Builder<Book>.CreateNew()
                    .With(b => b.Id = i)
                    .With(b => b.ForeignBookId = $"missing{i}")
                    .With(b => b.AuthorMetadata = _book.AuthorMetadata.Value)
                    .With(b => b.Author = _author)
                    .With(b => b.AddOptions = new AddBookOptions { AddType = BookAddType.Automatic })
                    .Build())
                .ToList();
        }

        [Test]
        public void should_stop_looking_up_missing_books_after_repeated_transport_failures()
        {
            var books = GivenBooksMissingFromAuthorList(10);

            Mocker.GetMock<IProvideBookInfo>()
                .Setup(s => s.GetBookInfo(It.IsAny<string>()))
                .Throws(new HttpRequestException("Connection refused"));

            Subject.RefreshBookInfo(books, new List<Book>(), _author, true, false, null);

            Mocker.GetMock<IProvideBookInfo>()
                .Verify(v => v.GetBookInfo(It.IsAny<string>()), Times.Exactly(3));

            Mocker.GetMock<IBookService>()
                .Verify(v => v.DeleteBook(It.IsAny<int>(), It.IsAny<bool>(), It.IsAny<bool>()), Times.Never());

            ExceptionVerification.ExpectedErrors(3);
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_stop_looking_up_missing_books_after_repeated_rate_limits()
        {
            var books = GivenBooksMissingFromAuthorList(10);
            var requests = 0;

            // Every lookup goes through the real proxy, and the metadata source answers 429 to everything
            Mocker.GetMock<IMetadataRequestBuilder>()
                .Setup(s => s.GetRequestBuilder())
                .Returns(new HttpRequestBuilder("http://rreading-glasses.local/{route}").CreateFactory());

            Mocker.GetMock<IHttpClient>()
                .Setup(s => s.Get(It.IsAny<HttpRequest>()))
                .Returns((HttpRequest request) =>
                {
                    requests++;
                    var headers = new HttpHeader();
                    headers.Add("Retry-After", "0");
                    return new HttpResponse(request, headers, string.Empty, HttpStatusCode.TooManyRequests);
                });

            Mocker.SetConstant<IProvideBookInfo>(Mocker.Resolve<BookInfoProxy>());

            Subject.RefreshBookInfo(books, new List<Book>(), _author, true, false, null);

            // Three lookups of 5 tries each (the proxy's 429 cap), instead of all ten
            requests.Should().Be(3 * 5);

            Mocker.GetMock<IBookService>()
                .Verify(v => v.DeleteBook(It.IsAny<int>(), It.IsAny<bool>(), It.IsAny<bool>()), Times.Never());

            ExceptionVerification.ExpectedErrors(3);
            ExceptionVerification.ExpectedWarns(4);
        }

        // The real proxy against rreading-glasses over mocked HTTP. The book's work 404s, as a work Goodreads merged
        // away does, and /book/{edition} answers editionStatus. A 303 points at /author/5?edition={edition}, whose
        // payload holds the edition under work newWorkId. That work itself credits newWorkAuthorId, and the book
        // being refreshed belongs to author 5.
        private void GivenMergedWork(HttpStatusCode editionStatus, string newWorkId = "2", string newWorkAuthorId = "5")
        {
            _book.AuthorMetadata.Value.ForeignAuthorId = "5";

            Mocker.GetMock<IMetadataRequestBuilder>()
                .Setup(s => s.GetRequestBuilder())
                .Returns(new HttpRequestBuilder("http://rreading-glasses.local/{route}").CreateFactory());

            Mocker.GetMock<IHttpClient>()
                .Setup(s => s.Get(It.IsAny<HttpRequest>()))
                .Returns((HttpRequest request) =>
                {
                    var path = new Uri(request.Url.FullUri).AbsolutePath;
                    var headers = new HttpHeader();

                    if (path == $"/work/{newWorkId}")
                    {
                        var work = "{\"ForeignId\":" + newWorkId + ",\"Title\":\"Merged\",\"Books\":[{\"ForeignId\":11,\"Title\":\"Merged\"," +
                                   "\"Contributors\":[{\"ForeignId\":" + newWorkAuthorId + ",\"Role\":\"Author\"}]}],\"Series\":[]," +
                                   "\"Authors\":[{\"ForeignId\":" + newWorkAuthorId + ",\"Name\":\"Author " + newWorkAuthorId + "\"}]}";

                        return new HttpResponse(request, headers, work);
                    }

                    if (path.StartsWith("/work/"))
                    {
                        return new HttpResponse(request, headers, string.Empty, HttpStatusCode.NotFound);
                    }

                    if (editionStatus == HttpStatusCode.SeeOther)
                    {
                        headers.Add("Location", $"/author/5?edition={path.Split('/').Last()}");
                    }

                    return new HttpResponse(request, headers, string.Empty, editionStatus);
                });

            Mocker.GetMock<ICachedHttpResponseService>()
                .Setup(s => s.Get(It.IsAny<HttpRequest>(), It.IsAny<bool>(), It.IsAny<TimeSpan>()))
                .Returns((HttpRequest request, bool useCache, TimeSpan ttl) =>
                {
                    var edition = HttpUtility.ParseQueryString(new Uri(request.Url.FullUri).Query)["edition"];
                    var content = "{\"ForeignId\":5,\"Name\":\"Author Five\",\"Works\":[{\"ForeignId\":" + newWorkId + ",\"Title\":\"Merged\"," +
                                  "\"Books\":[{\"ForeignId\":" + edition + ",\"Title\":\"Merged\",\"Contributors\":[{\"ForeignId\":5,\"Role\":\"Author\"}]}]}],\"Series\":[]}";

                    return new HttpResponse(request, new HttpHeader(), content);
                });

            Mocker.SetConstant<IProvideBookInfo>(Mocker.Resolve<BookInfoProxy>());
        }

        private void GivenMonitoredEdition(string foreignEditionId = "11", bool monitored = true)
        {
            Mocker.GetMock<IEditionService>()
                .Setup(s => s.GetEditionsByBook(It.IsAny<int>()))
                .Returns((int bookId) => new List<Edition>
                {
                    Builder<Edition>.CreateNew()
                        .With(e => e.Id = bookId)
                        .With(e => e.BookId = bookId)
                        .With(e => e.ForeignEditionId = foreignEditionId ?? $"1{bookId}")
                        .With(e => e.Monitored = monitored)
                        .Build()
                });
        }

        private void VerifyEditionLookups(int times)
        {
            Mocker.GetMock<IHttpClient>()
                .Verify(v => v.Get(It.Is<HttpRequest>(r => r.Url.FullUri.Contains("/book/"))), Times.Exactly(times));
        }

        private void VerifyBookDeleted(Times times)
        {
            Mocker.GetMock<IBookService>()
                .Verify(v => v.DeleteBook(_book.Id, false, false), times);
        }

        [Test]
        public void should_delete_book_whose_work_was_merged_into_a_book_already_in_the_library()
        {
            GivenMergedWork(HttpStatusCode.SeeOther);
            GivenMonitoredEdition();

            _book.Monitored = true;

            Mocker.GetMock<IBookService>()
                .Setup(s => s.FindById("2"))
                .Returns(Builder<Book>.CreateNew().With(b => b.Id = 2).With(b => b.ForeignBookId = "2").With(b => b.Monitored = true).Build());

            RefreshWithBookMissingFromAuthorList();

            VerifyEditionLookups(1);
            VerifyBookDeleted(Times.Once());

            Mocker.GetMock<IBookService>()
                .Verify(v => v.UpdateMany(It.IsAny<List<Book>>()), Times.Never());

            Mocker.GetMock<IBookService>()
                .Verify(v => v.SetBookMonitored(It.IsAny<int>(), It.IsAny<bool>()), Times.Never());

            Mocker.GetMock<IEditionService>()
                .Verify(v => v.SetMonitored(It.IsAny<Edition>()), Times.Never());

            ExceptionVerification.ExpectedErrors(1);
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_monitor_the_unmonitored_library_book_a_monitored_duplicate_was_merged_into()
        {
            GivenMergedWork(HttpStatusCode.SeeOther);
            GivenMonitoredEdition();

            _book.Monitored = true;

            Mocker.GetMock<IBookService>()
                .Setup(s => s.FindById("2"))
                .Returns(Builder<Book>.CreateNew().With(b => b.Id = 2).With(b => b.ForeignBookId = "2").With(b => b.Monitored = false).Build());

            RefreshWithBookMissingFromAuthorList();

            VerifyBookDeleted(Times.Once());

            Mocker.GetMock<IBookService>()
                .Verify(v => v.SetBookMonitored(2, true), Times.Once());

            // The edition the user monitored moves to the target before the duplicate's editions are deleted with it
            Mocker.GetMock<IEditionService>()
                .Verify(v => v.UpdateMany(It.Is<List<Edition>>(l => l.Single().ForeignEditionId == "11" && l.Single().BookId == 2)), Times.Once());

            Mocker.GetMock<IEditionService>()
                .Verify(v => v.SetMonitored(It.Is<Edition>(e => e.ForeignEditionId == "11" && e.BookId == 2)), Times.Once());

            ExceptionVerification.ExpectedErrors(1);
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_keep_book_whose_work_was_merged_into_another_authors_work_not_in_the_library()
        {
            GivenMergedWork(HttpStatusCode.SeeOther, newWorkAuthorId: "36289");
            GivenMonitoredEdition();

            _book.TitleSlug = _book.ForeignBookId;

            RefreshWithBookMissingFromAuthorList();

            VerifyEditionLookups(1);
            VerifyBookDeleted(Times.Never());

            Mocker.GetMock<IBookService>()
                .Verify(v => v.UpdateMany(It.IsAny<List<Book>>()), Times.Never());

            _book.ForeignBookId.Should().Be("1");
            _book.TitleSlug.Should().Be("1");

            ExceptionVerification.ExpectedErrors(1);
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_move_book_whose_work_was_merged_into_a_work_not_in_the_library()
        {
            GivenMergedWork(HttpStatusCode.SeeOther);
            GivenMonitoredEdition();

            _book.TitleSlug = _book.ForeignBookId;
            _book.Monitored = true;

            RefreshWithBookMissingFromAuthorList();

            VerifyEditionLookups(1);
            VerifyBookDeleted(Times.Never());

            Mocker.GetMock<IBookService>()
                .Verify(v => v.UpdateMany(It.Is<List<Book>>(l => l.Single() == _book)), Times.Once());

            _book.ForeignBookId.Should().Be("2");
            _book.TitleSlug.Should().Be("2");
            _book.Monitored.Should().BeTrue();

            ExceptionVerification.ExpectedErrors(1);
        }

        [Test]
        public void should_keep_book_under_its_old_id_when_another_book_holds_the_new_works_slug()
        {
            GivenMergedWork(HttpStatusCode.SeeOther);
            GivenMonitoredEdition();

            _book.TitleSlug = _book.ForeignBookId;

            // Books.TitleSlug is unique, so moving this book onto work 2 would fail to save
            Mocker.GetMock<IBookService>()
                .Setup(s => s.FindBySlug("2"))
                .Returns(Builder<Book>.CreateNew().With(b => b.Id = 99).With(b => b.ForeignBookId = "3").With(b => b.TitleSlug = "2").Build());

            RefreshWithBookMissingFromAuthorList();

            VerifyEditionLookups(1);
            VerifyBookDeleted(Times.Never());

            Mocker.GetMock<IBookService>()
                .Verify(v => v.UpdateMany(It.IsAny<List<Book>>()), Times.Never());

            _book.ForeignBookId.Should().Be("1");
            _book.TitleSlug.Should().Be("1");

            ExceptionVerification.ExpectedErrors(1);
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_delete_book_whose_work_and_edition_are_both_gone()
        {
            GivenMergedWork(HttpStatusCode.NotFound);
            GivenMonitoredEdition();

            RefreshWithBookMissingFromAuthorList();

            VerifyEditionLookups(1);
            VerifyBookDeleted(Times.Once());

            ExceptionVerification.ExpectedErrors(1);
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_delete_book_whose_work_is_gone_without_a_monitored_edition_to_follow()
        {
            GivenMergedWork(HttpStatusCode.SeeOther);
            GivenMonitoredEdition(monitored: false);

            RefreshWithBookMissingFromAuthorList();

            VerifyEditionLookups(0);
            VerifyBookDeleted(Times.Once());

            ExceptionVerification.ExpectedErrors(1);
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_keep_book_whose_work_is_gone_when_the_edition_lookup_errors()
        {
            GivenMergedWork(HttpStatusCode.InternalServerError);
            GivenMonitoredEdition();

            RefreshWithBookMissingFromAuthorList();

            VerifyEditionLookups(1);
            VerifyBookDeleted(Times.Never());

            Mocker.GetMock<IBookService>()
                .Verify(v => v.UpdateMany(It.IsAny<List<Book>>()), Times.Never());

            ExceptionVerification.ExpectedErrors(2);
        }

        [Test]
        public void should_count_failed_edition_lookups_against_the_missing_book_lookup_bound()
        {
            var books = GivenBooksMissingFromAuthorList(10);

            GivenMergedWork(HttpStatusCode.InternalServerError);
            GivenMonitoredEdition(foreignEditionId: null);

            Subject.RefreshBookInfo(books, new List<Book>(), _author, true, false, null);

            Mocker.GetMock<IHttpClient>()
                .Verify(v => v.Get(It.Is<HttpRequest>(r => r.Url.FullUri.Contains("/work/"))), Times.Exactly(3));

            VerifyEditionLookups(3);

            Mocker.GetMock<IBookService>()
                .Verify(v => v.DeleteBook(It.IsAny<int>(), It.IsAny<bool>(), It.IsAny<bool>()), Times.Never());

            ExceptionVerification.ExpectedErrors(6);
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_not_look_up_the_edition_of_a_book_that_has_files()
        {
            GivenMergedWork(HttpStatusCode.SeeOther);
            GivenMonitoredEdition();

            Mocker.GetMock<IMediaFileService>()
                .Setup(s => s.GetFilesByBook(_book.Id))
                .Returns(Builder<BookFile>.CreateListOfSize(1).BuildList());

            RefreshWithBookMissingFromAuthorList();

            VerifyEditionLookups(0);
            VerifyBookDeleted(Times.Never());

            ExceptionVerification.ExpectedErrors(2);
        }

        [Test]
        public void should_keep_book_when_refresh_book_lookup_returns_not_found()
        {
            Mocker.GetMock<IBookService>()
                .Setup(s => s.GetBook(_book.Id))
                .Returns(_book);

            Mocker.GetMock<IProvideBookInfo>()
                .Setup(s => s.GetBookInfo(_book.ForeignBookId))
                .Throws(new BookNotFoundException(_book.ForeignBookId));

            Subject.Execute(new RefreshBookCommand(_book.Id));

            Mocker.GetMock<IBookService>()
                .Verify(v => v.DeleteBook(It.IsAny<int>(), It.IsAny<bool>(), It.IsAny<bool>()), Times.Never());

            ExceptionVerification.ExpectedErrors(1);
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_refresh_the_other_books_when_one_lookup_fails_in_a_bulk_refresh()
        {
            var failing = Builder<Book>.CreateNew()
                .With(b => b.Id = 2)
                .With(b => b.ForeignBookId = "2")
                .With(b => b.AuthorMetadata = _book.AuthorMetadata.Value)
                .With(b => b.Author = _author)
                .Build();

            Mocker.GetMock<IBookService>()
                .Setup(s => s.GetBooks(It.IsAny<IEnumerable<int>>()))
                .Returns(new List<Book> { failing, _book });

            Mocker.GetMock<IProvideBookInfo>()
                .Setup(s => s.GetBookInfo(failing.ForeignBookId))
                .Throws(new BookInfoException("Unexpected error fetching book data"));

            GivenBookLookupReturnsBook();

            Subject.Execute(new BulkRefreshBookCommand(new List<int> { failing.Id, _book.Id }));

            Mocker.GetMock<IProvideBookInfo>()
                .Verify(v => v.GetBookInfo(_book.ForeignBookId), Times.Once());

            Mocker.GetMock<IBookService>()
                .Verify(v => v.UpdateMany(It.Is<List<Book>>(l => l.Contains(_book))), Times.AtLeastOnce());

            Mocker.GetMock<IBookService>()
                .Verify(v => v.DeleteBook(It.IsAny<int>(), It.IsAny<bool>(), It.IsAny<bool>()), Times.Never());

            ExceptionVerification.ExpectedErrors(1);
        }
    }
}
