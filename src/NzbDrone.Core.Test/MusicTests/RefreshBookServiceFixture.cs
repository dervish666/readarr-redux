using System;
using System.Collections.Generic;
using FizzWare.NBuilder;
using Moq;
using NUnit.Framework;
using NzbDrone.Core.Books;
using NzbDrone.Core.Exceptions;
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
        }

        private void GivenBookLookupReturnsBook()
        {
            var remoteAuthor = Builder<Author>.CreateNew()
                .With(a => a.Metadata = Builder<AuthorMetadata>.CreateNew().Build())
                .Build();

            var remoteBook = Builder<Book>.CreateNew()
                .With(b => b.Id = 0)
                .With(b => b.ForeignBookId = _book.ForeignBookId)
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
    }
}
