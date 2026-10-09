using System;
using System.Collections.Generic;
using System.Linq;
using FizzWare.NBuilder;
using Moq;
using NUnit.Framework;
using NzbDrone.Core.Books;
using NzbDrone.Core.ImportLists;
using NzbDrone.Core.ImportLists.Exclusions;
using NzbDrone.Core.MetadataSource;
using NzbDrone.Core.MetadataSource.BookInfo;
using NzbDrone.Core.MetadataSource.Goodreads;
using NzbDrone.Core.Parser.Model;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.ImportListTests
{
    public class ImportListSyncServiceFixture : CoreTest<ImportListSyncService>
    {
        private List<ImportListItemInfo> _importListReports;

        [SetUp]
        public void SetUp()
        {
            var importListItem1 = new ImportListItemInfo
            {
                Author = "Linkin Park"
            };

            _importListReports = new List<ImportListItemInfo> { importListItem1 };

            var mockImportList = new Mock<IImportList>();

            Mocker.GetMock<IFetchAndParseImportList>()
                .Setup(v => v.Fetch())
                .Returns(_importListReports);

            Mocker.GetMock<IGoodreadsSearchProxy>()
                .Setup(v => v.Search(It.IsAny<string>()))
                .Returns(new List<SearchJsonResource>());

            Mocker.GetMock<ISearchForNewBook>()
                .Setup(v => v.SearchByGoodreadsBookId(It.IsAny<long>(), false))
                .Returns<long, bool>((id, getAllEditions) => new List<Book>
                {
                    Builder<Book>
                        .CreateNew()
                        .With(b => b.AuthorMetadata = Builder<AuthorMetadata>.CreateNew().Build())
                        .With(b => b.ForeignBookId = "4321")
                        .With(b => b.Editions = Builder<Edition>
                            .CreateListOfSize(1)
                            .TheFirst(1)
                            .With(e => e.ForeignEditionId = id.ToString())
                            .With(e => e.Monitored = true)
                            .BuildList())
                        .Build()
                });

            Mocker.GetMock<IImportListFactory>()
                .Setup(v => v.Get(It.IsAny<int>()))
                .Returns(new ImportListDefinition { ShouldMonitor = ImportListMonitorType.SpecificBook });

            Mocker.GetMock<IImportListFactory>()
                .Setup(v => v.AutomaticAddEnabled(It.IsAny<bool>()))
                .Returns(new List<IImportList> { mockImportList.Object });

            Mocker.GetMock<IFetchAndParseImportList>()
                .Setup(v => v.Fetch())
                .Returns(_importListReports);

            Mocker.GetMock<IImportListExclusionService>()
                .Setup(v => v.All())
                .Returns(new List<ImportListExclusion>());

            Mocker.GetMock<IAddBookService>()
                .Setup(v => v.AddBooks(It.IsAny<List<Book>>(), false))
                .Returns<List<Book>, bool>((x, y) => x);

            Mocker.GetMock<IAddAuthorService>()
                .Setup(v => v.AddAuthors(It.IsAny<List<Author>>(), false))
                .Returns<List<Author>, bool>((x, y) => x);
        }

        private void WithBook()
        {
            _importListReports.First().Book = "Meteora";
        }

        private void WithAuthorId()
        {
            _importListReports.First().AuthorGoodreadsId = "f59c5520-5f46-4d2c-b2c4-822eabf53419";
        }

        private void WithBookId()
        {
            _importListReports.First().EditionGoodreadsId = "1234";
        }

        private void WithSecondBook()
        {
            var importListItem2 = new ImportListItemInfo
            {
                Author = "Linkin Park",
                AuthorGoodreadsId = "f59c5520-5f46-4d2c-b2c4-822eabf53419",
                Book = "Meteora 2",
                EditionGoodreadsId = "5678",
                BookGoodreadsId = "8765"
            };
            _importListReports.Add(importListItem2);
        }

        private void WithExistingAuthor()
        {
            Mocker.GetMock<IAuthorService>()
                .Setup(v => v.FindById(_importListReports.First().AuthorGoodreadsId))
                .Returns(new Author { Id = 1, ForeignAuthorId = _importListReports.First().AuthorGoodreadsId });
        }

        private void WithExistingBook()
        {
            Mocker.GetMock<IBookService>()
                .Setup(v => v.FindById("4321"))
                .Returns(new Book { Id = 1, ForeignBookId = _importListReports.First().BookGoodreadsId });
        }

        private void WithExcludedAuthor()
        {
            Mocker.GetMock<IImportListExclusionService>()
                .Setup(v => v.All())
                .Returns(new List<ImportListExclusion>
                {
                    new ImportListExclusion
                    {
                        ForeignId = "f59c5520-5f46-4d2c-b2c4-822eabf53419"
                    }
                });
        }

        private void WithExcludedBook()
        {
            Mocker.GetMock<IImportListExclusionService>()
                .Setup(v => v.All())
                .Returns(new List<ImportListExclusion>
                {
                    new ImportListExclusion
                    {
                        ForeignId = "4321"
                    }
                });
        }

        private void WithMonitorType(ImportListMonitorType monitor)
        {
            Mocker.GetMock<IImportListFactory>()
                .Setup(v => v.Get(It.IsAny<int>()))
                .Returns(new ImportListDefinition { ShouldMonitor = monitor });
        }

        [Test]
        public void should_search_if_author_title_and_no_author_id()
        {
            Subject.Execute(new ImportListSyncCommand());

            Mocker.GetMock<IGoodreadsSearchProxy>()
                .Verify(v => v.Search(It.IsAny<string>()), Times.Once());
        }

        [Test]
        public void should_not_search_if_author_title_and_author_id()
        {
            WithAuthorId();
            Subject.Execute(new ImportListSyncCommand());

            Mocker.GetMock<ISearchForNewAuthor>()
                .Verify(v => v.SearchForNewAuthor(It.IsAny<string>()), Times.Never());
        }

        [Test]
        public void should_search_if_book_title_and_no_book_id()
        {
            WithBook();
            Subject.Execute(new ImportListSyncCommand());

            Mocker.GetMock<IGoodreadsSearchProxy>()
                .Verify(v => v.Search(It.IsAny<string>()), Times.Once());
        }

        [Test]
        public void should_not_search_if_book_title_and_book_id()
        {
            WithAuthorId();
            WithBookId();
            Subject.Execute(new ImportListSyncCommand());

            Mocker.GetMock<IGoodreadsSearchProxy>()
                .Verify(v => v.Search(It.IsAny<string>()), Times.Never());
        }

        [Test]
        public void should_not_search_if_all_info()
        {
            WithAuthorId();
            WithBook();
            WithBookId();
            Subject.Execute(new ImportListSyncCommand());

            Mocker.GetMock<IGoodreadsSearchProxy>()
                .Verify(v => v.Search(It.IsAny<string>()), Times.Never());

            Mocker.GetMock<IGoodreadsSearchProxy>()
                .Verify(v => v.Search(It.IsAny<string>()), Times.Never());
        }

        [Test]
        public void should_not_add_if_existing_author()
        {
            WithAuthorId();
            WithExistingAuthor();

            Subject.Execute(new ImportListSyncCommand());

            Mocker.GetMock<IAddAuthorService>()
                .Verify(v => v.AddAuthors(It.Is<List<Author>>(t => t.Count == 0), false));
        }

        [Test]
        public void should_not_add_if_existing_book()
        {
            WithBookId();
            WithExistingBook();

            Subject.Execute(new ImportListSyncCommand());

            Mocker.GetMock<IAddAuthorService>()
                .Verify(v => v.AddAuthors(It.Is<List<Author>>(t => t.Count == 0), false));
        }

        [Test]
        public void should_add_if_existing_author_but_new_book()
        {
            WithBookId();
            WithAuthorId();
            WithExistingAuthor();

            Subject.Execute(new ImportListSyncCommand());

            Mocker.GetMock<IAddBookService>()
                .Verify(v => v.AddBooks(It.Is<List<Book>>(t => t.Count == 1), false));
        }

        [TestCase(ImportListMonitorType.None, false)]
        [TestCase(ImportListMonitorType.SpecificBook, true)]
        [TestCase(ImportListMonitorType.EntireAuthor, true)]
        public void should_add_if_not_existing_author(ImportListMonitorType monitor, bool expectedAuthorMonitored)
        {
            WithAuthorId();
            WithMonitorType(monitor);

            Subject.Execute(new ImportListSyncCommand());

            Mocker.GetMock<IAddAuthorService>()
                .Verify(v => v.AddAuthors(It.Is<List<Author>>(t => t.Count == 1 && t.First().Monitored == expectedAuthorMonitored), false));
        }

        [TestCase(ImportListMonitorType.None, false)]
        [TestCase(ImportListMonitorType.SpecificBook, true)]
        [TestCase(ImportListMonitorType.EntireAuthor, true)]
        public void should_add_if_not_existing_book(ImportListMonitorType monitor, bool expectedBookMonitored)
        {
            WithBookId();
            WithMonitorType(monitor);

            Subject.Execute(new ImportListSyncCommand());

            Mocker.GetMock<IAddBookService>()
                .Verify(v => v.AddBooks(It.Is<List<Book>>(t => t.Count == 1 && t.First().Monitored == expectedBookMonitored), false));
        }

        [Test]
        public void should_not_add_author_if_excluded_author()
        {
            WithAuthorId();
            WithExcludedAuthor();

            Subject.Execute(new ImportListSyncCommand());

            Mocker.GetMock<IAddAuthorService>()
                .Verify(v => v.AddAuthors(It.Is<List<Author>>(t => t.Count == 0), false));
        }

        [Test]
        public void should_not_add_book_if_excluded_book()
        {
            WithBookId();
            WithExcludedBook();

            Subject.Execute(new ImportListSyncCommand());

            Mocker.GetMock<IAddBookService>()
                .Verify(v => v.AddBooks(It.Is<List<Book>>(t => t.Count == 0), false));
        }

        [Test]
        public void should_not_add_book_if_excluded_author()
        {
            WithBookId();
            WithAuthorId();
            WithExcludedAuthor();

            Subject.Execute(new ImportListSyncCommand());

            Mocker.GetMock<IAddBookService>()
                .Verify(v => v.AddBooks(It.Is<List<Book>>(t => t.Count == 0), false));
        }

        [TestCase(ImportListMonitorType.None, 0, false)]
        [TestCase(ImportListMonitorType.SpecificBook, 2, true)]
        [TestCase(ImportListMonitorType.EntireAuthor, 0, true)]
        public void should_add_two_books(ImportListMonitorType monitor, int expectedBooksMonitored, bool expectedAuthorMonitored)
        {
            WithBook();
            WithBookId();
            WithSecondBook();
            WithAuthorId();
            WithMonitorType(monitor);

            Subject.Execute(new ImportListSyncCommand());

            Mocker.GetMock<IAddBookService>()
                .Verify(v => v.AddBooks(It.Is<List<Book>>(t => t.Count == 2), false));
            Mocker.GetMock<IAddAuthorService>()
                .Verify(v => v.AddAuthors(It.Is<List<Author>>(t => t.Count == 1 &&
                                                                   t.First().AddOptions.BooksToMonitor.Count == expectedBooksMonitored &&
                                                                   t.First().Monitored == expectedAuthorMonitored), false));
        }

        private void WithIdOnlySearchResult()
        {
            // rreading-glasses search results carry IDs only, no titles or author names
            Mocker.GetMock<IGoodreadsSearchProxy>()
                .Setup(v => v.Search(It.IsAny<string>()))
                .Returns(new List<SearchJsonResource>
                {
                    new SearchJsonResource { BookId = 12070, WorkId = 4110990, Author = new AuthorJsonResource { Id = 1221698 } }
                });

            Mocker.GetMock<IProvideBookInfo>()
                .Setup(v => v.GetBookInfo("4110990"))
                .Returns(Tuple.Create("1221698",
                    new Book { ForeignBookId = "4110990", Title = "Good Omens" },
                    new List<AuthorMetadata>
                    {
                        new AuthorMetadata { ForeignAuthorId = "1221698", Name = "Neil Gaiman" },
                        new AuthorMetadata { ForeignAuthorId = "1654", Name = "Terry Pratchett" }
                    }));
        }

        [Test]
        public void should_name_author_from_work_lookup_when_search_returns_only_ids()
        {
            _importListReports.First().Author = "Terry Pratchett";
            WithIdOnlySearchResult();

            Subject.Execute(new ImportListSyncCommand());

            Mocker.GetMock<IAddAuthorService>()
                .Verify(v => v.AddAuthors(It.Is<List<Author>>(t => t.Count == 1 &&
                                                                   t.First().ForeignAuthorId == "1654" &&
                                                                   t.First().Metadata.Value.Name == "Terry Pratchett"), false));
        }

        [Test]
        public void should_map_book_from_work_lookup_when_search_returns_only_ids()
        {
            _importListReports.First().Author = "Terry Pratchett";
            _importListReports.First().Book = "Good Omens";
            WithIdOnlySearchResult();

            Subject.Execute(new ImportListSyncCommand());

            Mocker.GetMock<IAddBookService>()
                .Verify(v => v.AddBooks(It.Is<List<Book>>(t => t.Count == 1 && t.First().ForeignBookId == "4110990"), false));
            Mocker.GetMock<IAddAuthorService>()
                .Verify(v => v.AddAuthors(It.Is<List<Author>>(t => t.Count == 1 && t.First().ForeignAuthorId == "1654"), false));
        }

        [Test]
        public void should_map_edition_through_the_metadata_source()
        {
            WithBookId();

            Subject.Execute(new ImportListSyncCommand());

            Mocker.GetMock<ISearchForNewBook>()
                .Verify(v => v.SearchByGoodreadsBookId(1234, false), Times.Once());
            Mocker.GetMock<IAddBookService>()
                .Verify(v => v.AddBooks(It.Is<List<Book>>(t => t.Count == 1 && t.First().ForeignBookId == "4321"), false));
        }

        [Test]
        public void should_add_series_item_that_only_carries_a_work_id()
        {
            _importListReports.First().Author = null;
            _importListReports.First().BookGoodreadsId = "194190";

            Mocker.GetMock<IProvideBookInfo>()
                .Setup(v => v.GetBookInfo("194190"))
                .Returns(Tuple.Create("1654",
                    new Book
                    {
                        ForeignBookId = "194190",
                        Title = "The Colour of Magic",
                        Editions = new List<Edition>
                        {
                            new Edition { ForeignEditionId = "11", Monitored = false },
                            new Edition { ForeignEditionId = "13153953", Monitored = true }
                        }
                    },
                    new List<AuthorMetadata> { new AuthorMetadata { ForeignAuthorId = "1654", Name = "Terry Pratchett" } }));

            Subject.Execute(new ImportListSyncCommand());

            // Adding a book needs the edition to monitor
            Mocker.GetMock<IAddBookService>()
                .Verify(v => v.AddBooks(It.Is<List<Book>>(t => t.Count == 1 &&
                                                               t.First().ForeignBookId == "194190" &&
                                                               t.First().Editions.Value.Single(e => e.Monitored).ForeignEditionId == "13153953"), false));
            Mocker.GetMock<IAddAuthorService>()
                .Verify(v => v.AddAuthors(It.Is<List<Author>>(t => t.Count == 1 &&
                                                                   t.First().ForeignAuthorId == "1654" &&
                                                                   t.First().Metadata.Value.Name == "Terry Pratchett"), false));
        }

        [Test]
        public void should_skip_series_item_whose_work_has_no_editions()
        {
            _importListReports.First().Author = null;
            _importListReports.First().BookGoodreadsId = "194190";

            Mocker.GetMock<IProvideBookInfo>()
                .Setup(v => v.GetBookInfo("194190"))
                .Returns(Tuple.Create("1654",
                    new Book { ForeignBookId = "194190", Title = "The Colour of Magic", Editions = new List<Edition>() },
                    new List<AuthorMetadata> { new AuthorMetadata { ForeignAuthorId = "1654", Name = "Terry Pratchett" } }));

            Subject.Execute(new ImportListSyncCommand());

            Mocker.GetMock<IAddBookService>()
                .Verify(v => v.AddBooks(It.Is<List<Book>>(t => t.Count == 0), false));
        }

        [Test]
        public void should_keep_edition_ids_too_big_for_an_int()
        {
            _importListReports.First().Book = "Big";
            _importListReports.First().AuthorGoodreadsId = "3000000000";
            _importListReports.First().BookGoodreadsId = "3000000001";
            _importListReports.First().EditionGoodreadsId = "3000000002";

            Subject.Execute(new ImportListSyncCommand());

            Mocker.GetMock<IAddBookService>()
                .Verify(v => v.AddBooks(It.Is<List<Book>>(t => t.Count == 1 &&
                                                               t.First().Editions.Value.Single().ForeignEditionId == "3000000002"), false));
        }

        [Test]
        public void should_not_look_up_series_item_already_in_library()
        {
            _importListReports.First().Author = null;
            _importListReports.First().BookGoodreadsId = "194190";

            Mocker.GetMock<IImportListFactory>()
                .Setup(v => v.Get(It.IsAny<int>()))
                .Returns(new ImportListDefinition { ShouldMonitor = ImportListMonitorType.SpecificBook, ShouldMonitorExisting = true });

            var author = new Author { Id = 1, Monitored = true, Metadata = new AuthorMetadata { ForeignAuthorId = "1654", Name = "Terry Pratchett" } };

            Mocker.GetMock<IBookService>()
                .Setup(v => v.FindById("194190"))
                .Returns(new Book { Id = 7, ForeignBookId = "194190", Title = "The Colour of Magic", Author = author, AuthorMetadata = author.Metadata.Value });

            Subject.Execute(new ImportListSyncCommand());

            Mocker.GetMock<IProvideBookInfo>()
                .Verify(v => v.GetBookInfo(It.IsAny<string>()), Times.Never());
            Mocker.GetMock<IBookService>()
                .Verify(v => v.SetBookMonitored(7, true), Times.Once());
        }

        [Test]
        public void should_keep_syncing_when_one_item_fails()
        {
            _importListReports.First().BookGoodreadsId = "1";
            WithSecondBook();

            Mocker.GetMock<IProvideBookInfo>()
                .Setup(v => v.GetBookInfo("1"))
                .Throws(new BookInfoException("Unexpected response fetching book data"));

            Subject.Execute(new ImportListSyncCommand());

            Mocker.GetMock<IAddBookService>()
                .Verify(v => v.AddBooks(It.Is<List<Book>>(t => t.Count == 1 && t.First().ForeignBookId == "8765"), false));
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_not_add_book_that_mapped_to_nothing()
        {
            WithBook();

            Subject.Execute(new ImportListSyncCommand());

            Mocker.GetMock<IAddBookService>()
                .Verify(v => v.AddBooks(It.Is<List<Book>>(t => t.Count == 0), false));
        }

        [Test]
        public void should_not_fetch_if_no_lists_are_enabled()
        {
            Mocker.GetMock<IImportListFactory>()
                .Setup(v => v.AutomaticAddEnabled(It.IsAny<bool>()))
                .Returns(new List<IImportList>());

            Subject.Execute(new ImportListSyncCommand());

            Mocker.GetMock<IFetchAndParseImportList>()
                .Verify(v => v.Fetch(), Times.Never);
        }

        [Test]
        public void should_not_process_if_no_items_are_returned()
        {
            Mocker.GetMock<IFetchAndParseImportList>()
                .Setup(v => v.Fetch())
                .Returns(new List<ImportListItemInfo>());

            Subject.Execute(new ImportListSyncCommand());

            Mocker.GetMock<IImportListExclusionService>()
                .Verify(v => v.All(), Times.Never);
        }
    }
}
