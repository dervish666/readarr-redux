using System.Collections.Generic;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Core.Books;
using NzbDrone.Core.MediaFiles;
using NzbDrone.Core.MediaFiles.BookImport;
using NzbDrone.Core.MediaFiles.BookImport.Identification;
using NzbDrone.Core.MetadataSource;
using NzbDrone.Core.MetadataSource.BookInfo;
using NzbDrone.Core.MetadataSource.Goodreads;
using NzbDrone.Core.Parser.Model;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.MediaFiles.BookImport.Identification
{
    [TestFixture]
    public class CandidateServiceFixture : CoreTest<CandidateService>
    {
        private LocalEdition GivenLocalCandidates()
        {
            var author = new Author { Id = 1, AuthorMetadataId = 10 };
            var book = new Book { Id = 20, AuthorMetadataId = 10 };
            var edition = new Edition { Id = 30, BookId = 20 };

            Mocker.GetMock<IAuthorService>().Setup(s => s.GetCandidates(It.IsAny<string>()))
                .Returns(new List<Author> { author });
            Mocker.GetMock<IBookService>().Setup(s => s.GetCandidates(10, It.IsAny<string>()))
                .Returns(new List<Book> { book });
            Mocker.GetMock<IEditionService>().Setup(s => s.GetEditionsByBook(20))
                .Returns(new List<Edition> { edition });
            Mocker.GetMock<IEditionService>().Setup(s => s.GetCandidates(10, It.IsAny<string>()))
                .Returns(new List<Edition> { edition, new Edition { Id = 31, BookId = 20 } });
            Mocker.GetMock<IMediaFileService>().Setup(s => s.GetFilesByBook(20))
                .Returns(new List<BookFile> { new BookFile { Id = 40 } });

            return new LocalEdition
            {
                LocalBooks = new List<LocalBook>
                {
                    new LocalBook { FileTrackInfo = new ParsedTrackInfo { Authors = new List<string> { "Author" }, BookTitle = "Book" } }
                }
            };
        }

        [Test]
        public void should_score_each_edition_once_and_preserve_candidate_order()
        {
            var local = GivenLocalCandidates();

            Subject.GetDbCandidatesFromTags(local, null, true)
                .Should().SatisfyRespectively(
                    c => c.Edition.Id.Should().Be(30),
                    c => c.Edition.Id.Should().Be(31));
        }

        [Test]
        public void should_reuse_lookups_only_within_the_same_batch()
        {
            var local = GivenLocalCandidates();
            var cache = new CandidateCache();

            Subject.GetDbCandidatesFromTags(local, null, true, cache);
            Subject.GetDbCandidatesFromTags(local, null, true, cache);

            Mocker.GetMock<IAuthorService>().Verify(s => s.GetCandidates("Author"), Times.Once());
            Mocker.GetMock<IBookService>().Verify(s => s.GetCandidates(10, "Book"), Times.Once());
            Mocker.GetMock<IEditionService>().Verify(s => s.GetCandidates(10, "Book"), Times.Once());
            Mocker.GetMock<IEditionService>().Verify(s => s.GetEditionsByBook(20), Times.Once());

            Subject.GetDbCandidatesFromTags(local, null, true, new CandidateCache());

            Mocker.GetMock<IAuthorService>().Verify(s => s.GetCandidates("Author"), Times.Exactly(2));
            Mocker.GetMock<IBookService>().Verify(s => s.GetCandidates(10, "Book"), Times.Exactly(2));
        }

        [Test]
        public void should_keep_titles_and_authors_separate_in_the_batch_cache()
        {
            var local = GivenLocalCandidates();
            var cache = new CandidateCache();
            Subject.GetDbCandidatesFromTags(local, null, false, cache);

            local.LocalBooks[0].FileTrackInfo.BookTitle = "Other book";
            Subject.GetDbCandidatesFromTags(local, null, false, cache);

            Mocker.GetMock<IBookService>().Verify(s => s.GetCandidates(10, "Other book"), Times.Once());
            Mocker.GetMock<IEditionService>().Verify(s => s.GetEditionsByBook(20), Times.Once());

            var otherAuthor = new Author { Id = 2, AuthorMetadataId = 11 };
            Mocker.GetMock<IBookService>().Setup(s => s.GetCandidates(11, "Other book")).Returns(new List<Book>());
            Mocker.GetMock<IEditionService>().Setup(s => s.GetCandidates(11, "Other book"))
                .Returns(new List<Edition> { new Edition { Id = 32, BookId = 21 } });

            Subject.GetDbCandidatesFromTags(local, new IdentificationOverrides { Author = otherAuthor }, false, cache)
                .Should().ContainSingle().Which.Edition.Id.Should().Be(32);
        }

        [Test]
        public void should_bound_the_cache_during_large_library_scans()
        {
            var local = GivenLocalCandidates();
            var cache = new CandidateCache();
            for (var i = 0; i < 2000; i++)
            {
                local.LocalBooks[0].FileTrackInfo.BookTitle = $"Book {i}";
                Subject.GetDbCandidatesFromTags(local, null, false, cache).Should().HaveCount(2);
            }

            cache.Candidates.Count.Should().BeLessOrEqualTo(512);
        }

        [Test]
        public void should_respect_include_existing_when_reusing_the_batch_cache()
        {
            var local = GivenLocalCandidates();
            var cache = new CandidateCache();

            Subject.GetDbCandidatesFromTags(local, null, false, cache).Should().OnlyContain(c => c.ExistingFiles.Count == 0);
            Subject.GetDbCandidatesFromTags(local, null, true, cache).Should().OnlyContain(c => c.ExistingFiles.Count == 1);
        }

        [Test]
        public void should_see_new_candidates_in_the_next_batch_after_an_empty_result()
        {
            var local = GivenLocalCandidates();
            var cache = new CandidateCache();
            Mocker.GetMock<IAuthorService>().Setup(s => s.GetCandidates("Author")).Returns(new List<Author>());

            Subject.GetDbCandidatesFromTags(local, null, true, cache).Should().BeEmpty();
            Mocker.GetMock<IAuthorService>().Setup(s => s.GetCandidates("Author"))
                .Returns(new List<Author> { new Author { AuthorMetadataId = 10 } });

            Subject.GetDbCandidatesFromTags(local, null, true, new CandidateCache()).Should().HaveCount(2);
        }

        [Test]
        public void should_not_throw_on_goodreads_exception()
        {
            Mocker.GetMock<ISearchForNewBook>()
                .Setup(s => s.SearchForNewBook(It.IsAny<string>(), It.IsAny<string>(), true))
                .Throws(new GoodreadsException("Bad search"));

            var edition = new LocalEdition
            {
                LocalBooks = new List<LocalBook>
                {
                    new LocalBook
                    {
                        FileTrackInfo = new ParsedTrackInfo
                        {
                            Authors = new List<string> { "Author" },
                            BookTitle = "Book"
                        }
                    }
                }
            };

            Subject.GetRemoteCandidates(edition, null).Should().BeEmpty();
        }

        [Test]
        public void should_fall_back_to_title_search_when_isbn_search_fails()
        {
            Mocker.GetMock<ISearchForNewBook>()
                .Setup(s => s.SearchByIsbn(It.IsAny<string>()))
                .Throws(new BookInfoException("Search for '9780552166591' failed"));

            Mocker.GetMock<ISearchForNewBook>()
                .Setup(s => s.SearchForNewBook(It.IsAny<string>(), It.IsAny<string>(), true))
                .Returns(new List<Book>());

            var edition = new LocalEdition
            {
                LocalBooks = new List<LocalBook>
                {
                    new LocalBook
                    {
                        FileTrackInfo = new ParsedTrackInfo
                        {
                            Isbn = "9780552166591",
                            Authors = new List<string> { "Terry Pratchett" },
                            BookTitle = "The Colour of Magic"
                        }
                    }
                }
            };

            Subject.GetRemoteCandidates(edition, null).Should().BeEmpty();

            Mocker.GetMock<ISearchForNewBook>()
                .Verify(s => s.SearchForNewBook("The Colour of Magic", "Terry Pratchett", true), Times.Once());
        }
    }
}
