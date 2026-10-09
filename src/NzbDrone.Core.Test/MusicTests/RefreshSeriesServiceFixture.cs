using System.Collections.Generic;
using System.Linq;
using FizzWare.NBuilder;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.Books;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.MusicTests
{
    [TestFixture]
    public class RefreshSeriesServiceFixture : DbTest
    {
        private AuthorMetadata _metadata;
        private Book _book;
        private RefreshSeriesService _subject;

        [SetUp]
        public void Setup()
        {
            Mocker.SetConstant<IBookRepository>(Mocker.Resolve<BookRepository>());
            Mocker.SetConstant<ISeriesRepository>(Mocker.Resolve<SeriesRepository>());
            Mocker.SetConstant<ISeriesBookLinkRepository>(Mocker.Resolve<SeriesBookLinkRepository>());
            Mocker.SetConstant<IBookService>(Mocker.Resolve<BookService>());
            Mocker.SetConstant<ISeriesService>(Mocker.Resolve<SeriesService>());
            Mocker.SetConstant<ISeriesBookLinkService>(Mocker.Resolve<SeriesBookLinkService>());
            Mocker.SetConstant<IRefreshSeriesBookLinkService>(Mocker.Resolve<RefreshSeriesBookLinkService>());

            _metadata = Builder<AuthorMetadata>.CreateNew()
                .With(x => x.Id = 0)
                .With(x => x.ForeignAuthorId = "124365")
                .With(x => x.Name = "Elise Allen")
                .Build();
            Mocker.Resolve<AuthorMetadataRepository>().Insert(_metadata);

            _book = new Book
            {
                Title = "Silky and the Rainbow Feather",
                ForeignBookId = "9758412",
                TitleSlug = "9758412",
                CleanTitle = "silkyrainbowfeather",
                AuthorMetadataId = _metadata.Id
            };
            Mocker.Resolve<BookRepository>().Insert(_book);

            _subject = Mocker.Resolve<RefreshSeriesService>();
        }

        // Live case, Elise Allen on 2026-10-09: books added one at a time, each add refreshing the author from the
        // same cached payload. The metadata profile filters these books out of the author refresh, so their remote
        // copies never get a database id, and the payload's series links are the objects saved last time.
        private Author GivenCachedAuthor()
        {
            var remoteBook = new Book { ForeignBookId = _book.ForeignBookId, Title = _book.Title };
            var series = new Series { ForeignSeriesId = "209531", Title = "Enchanted Fairies" };

            series.LinkItems = new List<SeriesBookLink>
            {
                new SeriesBookLink { Book = remoteBook, Series = series, Position = "1", SeriesPosition = 1, IsPrimary = true }
            };
            remoteBook.SeriesLinks = series.LinkItems.Value.ToList();

            return new Author { Metadata = _metadata, Series = new List<Series> { series } };
        }

        private void Refresh(Author remote)
        {
            _subject.RefreshSeriesInfo(_metadata.Id, remote.Series.Value, remote, false, false, null);
        }

        private List<SeriesBookLink> StoredLinks()
        {
            return Mocker.Resolve<SeriesBookLinkRepository>().All().ToList();
        }

        [Test]
        public void should_link_the_series_to_the_library_book_when_the_author_refresh_skipped_it()
        {
            Refresh(GivenCachedAuthor());

            StoredLinks().Should().ContainSingle().Which.BookId.Should().Be(_book.Id);
        }

        [Test]
        public void should_refresh_twice_from_the_same_cached_author()
        {
            var remote = GivenCachedAuthor();

            Refresh(remote);
            Refresh(remote);

            StoredLinks().Should().ContainSingle().Which.BookId.Should().Be(_book.Id);
            Mocker.Resolve<SeriesRepository>().All().Should().ContainSingle();
        }

        [Test]
        public void should_not_write_database_ids_into_the_cached_author()
        {
            var remote = GivenCachedAuthor();

            Refresh(remote);

            remote.Series.Value.Should().OnlyContain(s => s.Id == 0);
            remote.Series.Value.SelectMany(s => s.LinkItems.Value).Should().OnlyContain(l => l.Id == 0 && l.BookId == 0);
        }

        [Test]
        public void should_add_a_link_for_a_book_added_since_the_author_was_cached()
        {
            var remote = GivenCachedAuthor();
            var series = remote.Series.Value.Single();

            var laterBook = new Book { ForeignBookId = "7104947", Title = "Melody and the Enchanted Harp" };
            series.LinkItems.Value.Add(new SeriesBookLink { Book = laterBook, Series = series, Position = "2", SeriesPosition = 2 });

            Refresh(remote);

            var added = new Book
            {
                Title = laterBook.Title,
                ForeignBookId = laterBook.ForeignBookId,
                TitleSlug = laterBook.ForeignBookId,
                CleanTitle = "melodyenchantedharp",
                AuthorMetadataId = _metadata.Id
            };
            Mocker.Resolve<BookRepository>().Insert(added);

            Refresh(remote);

            StoredLinks().Select(x => x.BookId).Should().BeEquivalentTo(new[] { _book.Id, added.Id });
        }
    }
}
