using System.Collections.Generic;
using Dapper;
using FizzWare.NBuilder;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.Books;
using NzbDrone.Core.Datastore;
using NzbDrone.Core.Housekeeping.Housekeepers;
using NzbDrone.Core.MediaFiles;
using NzbDrone.Core.Qualities;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.Housekeeping.Housekeepers
{
    [TestFixture]
    public class CleanupOrphanedBooksFixture : DbTest<CleanupOrphanedBooks, Book>
    {
        [Test]
        public void should_delete_orphaned_books()
        {
            var book = Builder<Book>.CreateNew()
                .BuildNew();

            Db.Insert(book);
            Subject.Clean();
            AllStoredModels.Should().BeEmpty();
        }

        [Test]
        public void should_not_delete_orphaned_book_that_has_files()
        {
            var book = Builder<Book>.CreateNew()
                .With(b => b.AddOptions = new AddBookOptions { AddType = BookAddType.Automatic })
                .BuildNew();
            Db.Insert(book);

            var edition = Builder<Edition>.CreateNew()
                .With(e => e.BookId = book.Id)
                .BuildNew();
            Db.Insert(edition);

            var bookFile = Builder<BookFile>.CreateNew()
                .With(f => f.EditionId = edition.Id)
                .With(f => f.Quality = new QualityModel())
                .BuildNew();
            Db.Insert(bookFile);

            Subject.Clean();

            AllStoredModels.Should().ContainSingle(b => b.Id == book.Id);
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_not_delete_orphaned_book_added_by_hand()
        {
            var manual = Builder<Book>.CreateNew()
                .With(b => b.AddOptions = new AddBookOptions { AddType = BookAddType.Manual })
                .With(b => b.TitleSlug = "manual")
                .With(b => b.ForeignBookId = "manual")
                .BuildNew();

            var automatic = Builder<Book>.CreateNew()
                .With(b => b.AddOptions = new AddBookOptions { AddType = BookAddType.Automatic })
                .With(b => b.TitleSlug = "automatic")
                .With(b => b.ForeignBookId = "automatic")
                .BuildNew();

            Db.InsertMany(new List<Book> { manual, automatic });

            Subject.Clean();

            AllStoredModels.Should().ContainSingle().Which.Id.Should().Be(manual.Id);
            ExceptionVerification.ExpectedWarns(1);
        }

        // The book was judged deletable, then gained a file, an author or a manual add before the delete ran
        [TestCase("file")]
        [TestCase("author")]
        [TestCase("manual")]
        public void should_not_delete_a_candidate_that_changed_after_it_was_selected(string change)
        {
            var book = Builder<Book>.CreateNew()
                .With(b => b.AuthorMetadataId = 5)
                .With(b => b.AddOptions = new AddBookOptions { AddType = BookAddType.Automatic })
                .BuildNew();
            Db.Insert(book);

            var candidate = new CleanupOrphanedBooks.OrphanedBook { Id = book.Id, AddOptions = Raw(book.Id) };

            if (change == "file")
            {
                var edition = Builder<Edition>.CreateNew().With(e => e.BookId = book.Id).BuildNew();
                Db.Insert(edition);
                Db.Insert(Builder<BookFile>.CreateNew().With(f => f.EditionId = edition.Id).With(f => f.Quality = new QualityModel()).BuildNew());
            }
            else if (change == "author")
            {
                Db.Insert(Builder<Author>.CreateNew().With(a => a.AuthorMetadataId = 5).With(a => a.Metadata = new AuthorMetadata { Id = 5 }).BuildNew());
            }
            else
            {
                book.AddOptions = new AddBookOptions { AddType = BookAddType.Manual };
                Db.Update(book);
            }

            using var mapper = Mocker.Resolve<IMainDatabase>().OpenConnection();
            Subject.DeleteIfStillOrphaned(mapper, new List<CleanupOrphanedBooks.OrphanedBook> { candidate }).Should().Be(0);

            AllStoredModels.Should().ContainSingle(b => b.Id == book.Id);
        }

        [Test]
        public void should_delete_a_candidate_that_is_still_orphaned()
        {
            var book = Builder<Book>.CreateNew()
                .With(b => b.AddOptions = new AddBookOptions { AddType = BookAddType.Automatic })
                .BuildNew();
            Db.Insert(book);

            using var mapper = Mocker.Resolve<IMainDatabase>().OpenConnection();
            Subject.DeleteIfStillOrphaned(mapper, new List<CleanupOrphanedBooks.OrphanedBook> { new () { Id = book.Id, AddOptions = Raw(book.Id) } }).Should().Be(1);

            AllStoredModels.Should().BeEmpty();
        }

        private string Raw(int bookId)
        {
            using var mapper = Mocker.Resolve<IMainDatabase>().OpenConnection();
            return mapper.QuerySingle<string>(@"SELECT ""AddOptions"" FROM ""Books"" WHERE ""Id"" = @Id", new { Id = bookId });
        }

        [Test]
        public void should_not_delete_unorphaned_books()
        {
            var author = Builder<Author>.CreateNew()
                .With(e => e.Metadata = new AuthorMetadata { Id = 1 })
                .BuildNew();

            Db.Insert(author);

            var books = Builder<Book>.CreateListOfSize(2)
                .TheFirst(1)
                .With(e => e.AuthorMetadataId = author.Metadata.Value.Id)
                .BuildListOfNew();

            Db.InsertMany(books);
            Subject.Clean();
            AllStoredModels.Should().HaveCount(1);
            AllStoredModels.Should().Contain(e => e.AuthorMetadataId == author.Metadata.Value.Id);
        }
    }
}
