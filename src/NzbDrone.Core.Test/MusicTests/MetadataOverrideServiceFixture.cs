using System.Collections.Generic;
using System.Linq;
using FizzWare.NBuilder;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Core.Books;
using NzbDrone.Core.Books.Commands;
using NzbDrone.Core.Messaging.Commands;
using NzbDrone.Core.MetadataSource;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.MusicTests
{
    // Defiance of the Fall, in a real library: the metadata source lists only 10 of the 18 books in the series, and a
    // refresh used to delete any link it didn't list.
    [TestFixture]
    public class MetadataOverrideServiceFixture : DbTest
    {
        private AuthorMetadata _metadata;
        private Book _book1;
        private Book _book7;
        private Series _series;
        private MetadataOverrideService _subject;
        private RefreshSeriesService _refresh;

        [SetUp]
        public void Setup()
        {
            Mocker.SetConstant<IBookRepository>(Mocker.Resolve<BookRepository>());
            Mocker.SetConstant<IEditionRepository>(Mocker.Resolve<EditionRepository>());
            Mocker.SetConstant<ISeriesRepository>(Mocker.Resolve<SeriesRepository>());
            Mocker.SetConstant<ISeriesBookLinkRepository>(Mocker.Resolve<SeriesBookLinkRepository>());
            Mocker.SetConstant<IAuthorMetadataRepository>(Mocker.Resolve<AuthorMetadataRepository>());
            Mocker.SetConstant<IBookService>(Mocker.Resolve<BookService>());
            Mocker.SetConstant<IEditionService>(Mocker.Resolve<EditionService>());
            Mocker.SetConstant<ISeriesService>(Mocker.Resolve<SeriesService>());
            Mocker.SetConstant<ISeriesBookLinkService>(Mocker.Resolve<SeriesBookLinkService>());
            Mocker.SetConstant<IAuthorMetadataService>(Mocker.Resolve<AuthorMetadataService>());
            Mocker.SetConstant<IRefreshSeriesBookLinkService>(Mocker.Resolve<RefreshSeriesBookLinkService>());

            _metadata = Builder<AuthorMetadata>.CreateNew()
                .With(x => x.Id = 0)
                .With(x => x.ForeignAuthorId = "17113212")
                .With(x => x.Name = "TheFirstDefier")
                .With(x => x.Overview = string.Empty)
                .With(x => x.MetadataOverrides = new AuthorMetadataOverrides())
                .Build();
            Mocker.Resolve<AuthorMetadataRepository>().Insert(_metadata);

            _book1 = GivenBook("57560", "Defiance of the Fall");
            _book7 = GivenBook("57567", "Defiance of the Fall 7");

            _series = new Series { ForeignSeriesId = "289437", Title = "Defiance of the Fall", Description = string.Empty, Numbered = true };
            Mocker.Resolve<SeriesRepository>().Insert(_series);
            Mocker.Resolve<SeriesBookLinkRepository>().Insert(new SeriesBookLink { SeriesId = _series.Id, BookId = _book1.Id, Position = "1", SeriesPosition = 1, IsPrimary = true });

            _subject = Mocker.Resolve<MetadataOverrideService>();
            _refresh = Mocker.Resolve<RefreshSeriesService>();
        }

        private Book GivenBook(string foreignId, string title)
        {
            var book = new Book
            {
                Title = title,
                ForeignBookId = foreignId,
                TitleSlug = foreignId,
                CleanTitle = Parser.Parser.CleanAuthorName(title),
                AuthorMetadataId = _metadata.Id,
                MetadataOverrides = new BookMetadataOverrides()
            };

            Mocker.Resolve<BookRepository>().Insert(book);

            var edition = new Edition
            {
                BookId = book.Id,
                ForeignEditionId = foreignId + "-e",
                TitleSlug = foreignId + "-e",
                Title = title,
                Overview = "From the source",
                PageCount = 700,
                Monitored = true,
                Images = new List<MediaCover.MediaCover>(),
                Links = new List<Links>(),
                Ratings = new Ratings()
            };

            Mocker.Resolve<EditionRepository>().Insert(edition);

            return book;
        }

        // The source's view of the author: the series, with only book 1 linked at position 1
        private Author SourceAuthor(string position = "1")
        {
            var series = new Series { ForeignSeriesId = _series.ForeignSeriesId, Title = _series.Title, Description = string.Empty, Numbered = true };
            series.LinkItems = new List<SeriesBookLink>
            {
                new SeriesBookLink { Book = new Book { ForeignBookId = _book1.ForeignBookId }, Series = series, Position = position, SeriesPosition = 1, IsPrimary = true }
            };

            return new Author { Metadata = _metadata, Series = new List<Series> { series } };
        }

        private void Refresh(Author source = null)
        {
            source ??= SourceAuthor();
            _refresh.RefreshSeriesInfo(_metadata.Id, source.Series.Value, source, false, false, null);
        }

        private List<SeriesBookLink> Links()
        {
            return Mocker.Resolve<SeriesBookLinkRepository>().All().ToList();
        }

        private BookMetadataEdit EditOf(Book book)
        {
            return _subject.GetBookMetadata(book.Id);
        }

        [Test]
        public void should_keep_a_book_added_to_a_series_by_hand_through_a_refresh()
        {
            var edit = EditOf(_book7);
            edit.Series.Add(new BookSeriesEdit { SeriesId = _series.Id, Position = "7" });
            _subject.UpdateBookMetadata(_book7.Id, edit);

            Refresh();

            var link = Links().Single(x => x.BookId == _book7.Id);
            link.IsManual.Should().BeTrue();
            link.Position.Should().Be("7");
            link.SeriesPosition.Should().Be(7);
            Links().Should().HaveCount(2);
        }

        [Test]
        public void should_keep_a_position_set_by_hand_through_a_refresh()
        {
            var edit = EditOf(_book1);
            edit.Series.Single().Position = "1.5";
            _subject.UpdateBookMetadata(_book1.Id, edit);

            Refresh();

            Links().Single().Position.Should().Be("1.5");
        }

        [Test]
        public void should_keep_a_book_taken_out_of_a_series_out_after_a_refresh()
        {
            var edit = EditOf(_book1);
            edit.Series.Clear();
            _subject.UpdateBookMetadata(_book1.Id, edit);

            Refresh();

            Links().Should().BeEmpty();
            Mocker.Resolve<BookRepository>().Get(_book1.Id).MetadataOverrides.RemovedFromSeries.Should().Equal("289437");
        }

        [Test]
        public void should_link_a_book_again_when_added_back_to_a_series_it_was_taken_out_of()
        {
            var edit = EditOf(_book1);
            edit.Series.Clear();
            _subject.UpdateBookMetadata(_book1.Id, edit);

            edit = EditOf(_book1);
            edit.Series.Add(new BookSeriesEdit { SeriesId = _series.Id, Position = "1" });
            _subject.UpdateBookMetadata(_book1.Id, edit);

            Refresh();

            Links().Should().ContainSingle(x => x.BookId == _book1.Id);
            Mocker.Resolve<BookRepository>().Get(_book1.Id).MetadataOverrides.RemovedFromSeries.Should().BeEmpty();
        }

        [Test]
        public void should_keep_a_series_the_user_started_through_a_refresh()
        {
            var edit = EditOf(_book7);
            edit.Series.Add(new BookSeriesEdit { NewSeriesTitle = "Defiance of the Fall: Side Stories", Position = "1" });
            _subject.UpdateBookMetadata(_book7.Id, edit);

            Refresh();

            var started = Mocker.Resolve<SeriesRepository>().All().Single(x => x.Id != _series.Id);
            started.ForeignSeriesId.Should().StartWith(MetadataOverrideService.LocalSeriesPrefix);
            Links().Should().ContainSingle(x => x.SeriesId == started.Id && x.BookId == _book7.Id);
        }

        [Test]
        public void should_remove_a_series_the_user_started_once_it_is_empty()
        {
            var edit = EditOf(_book7);
            edit.Series.Add(new BookSeriesEdit { NewSeriesTitle = "Side Stories", Position = "1" });
            _subject.UpdateBookMetadata(_book7.Id, edit);

            edit = EditOf(_book7);
            edit.Series.Clear();
            _subject.UpdateBookMetadata(_book7.Id, edit);

            Mocker.Resolve<SeriesRepository>().All().Should().ContainSingle().Which.Id.Should().Be(_series.Id);
        }

        [Test]
        public void should_still_take_the_sources_position_for_its_own_links()
        {
            Refresh(SourceAuthor("1 (Prologue)"));

            Links().Single().Position.Should().Be("1 (Prologue)");
        }

        [Test]
        public void should_put_the_users_values_on_the_book_and_every_edition()
        {
            var edit = EditOf(_book7);
            edit.Title = "Defiance of the Fall 7: The Ruins";
            edit.Overview = "Zac reaches the ruins.";
            edit.PageCount = 913;
            _subject.UpdateBookMetadata(_book7.Id, edit);

            var book = Mocker.Resolve<BookRepository>().Get(_book7.Id);
            book.Title.Should().Be("Defiance of the Fall 7: The Ruins");
            book.CleanTitle.Should().Be(Parser.Parser.CleanAuthorName("Defiance of the Fall 7: The Ruins"));

            var edition = Mocker.Resolve<EditionRepository>().All().Single(x => x.BookId == _book7.Id);
            edition.Title.Should().Be("Defiance of the Fall 7: The Ruins");
            edition.Overview.Should().Be("Zac reaches the ruins.");
            edition.PageCount.Should().Be(913);

            Mocker.GetMock<IManageCommandQueue>().Verify(v => v.Push(It.IsAny<RefreshBookCommand>(), It.IsAny<CommandPriority>(), It.IsAny<CommandTrigger>()), Times.Never());
        }

        [Test]
        public void should_refresh_a_book_when_an_override_is_cleared()
        {
            var edit = EditOf(_book7);
            edit.Overview = "Zac reaches the ruins.";
            _subject.UpdateBookMetadata(_book7.Id, edit);

            edit = EditOf(_book7);
            edit.Overview = null;
            _subject.UpdateBookMetadata(_book7.Id, edit);

            Mocker.Resolve<EditionRepository>().All().Single(x => x.BookId == _book7.Id).Overview.Should().BeEmpty();
            Mocker.GetMock<IManageCommandQueue>()
                .Verify(v => v.Push(It.Is<RefreshBookCommand>(c => c.BookId == _book7.Id), It.IsAny<CommandPriority>(), It.IsAny<CommandTrigger>()), Times.Once());
        }

        [Test]
        public void should_keep_an_author_overview_set_by_hand_when_the_source_sends_another()
        {
            var author = new Author { Id = 4, Metadata = _metadata };
            Mocker.GetMock<IAuthorService>().Setup(s => s.GetAuthor(4)).Returns(author);

            _subject.UpdateAuthorOverview(4, "Writes Defiance of the Fall.");

            var source = Builder<AuthorMetadata>.CreateNew()
                .With(x => x.Id = 0)
                .With(x => x.ForeignAuthorId = _metadata.ForeignAuthorId)
                .With(x => x.Name = "TheFirstDefier")
                .With(x => x.Overview = "A bio from the source.")
                .Build();

            Mocker.Resolve<AuthorMetadataRepository>().UpsertMany(new List<AuthorMetadata> { source });

            var stored = Mocker.Resolve<AuthorMetadataRepository>().Get(_metadata.Id);
            stored.Overview.Should().Be("Writes Defiance of the Fall.");
            stored.MetadataOverrides.Overview.Should().Be("Writes Defiance of the Fall.");
        }

        [Test]
        public void should_take_the_sources_author_overview_again_once_cleared()
        {
            var author = new Author { Id = 4, Metadata = _metadata };
            Mocker.GetMock<IAuthorService>().Setup(s => s.GetAuthor(4)).Returns(author);

            _subject.UpdateAuthorOverview(4, "Writes Defiance of the Fall.");
            _subject.UpdateAuthorOverview(4, "  ");

            var stored = Mocker.Resolve<AuthorMetadataRepository>().Get(_metadata.Id);
            stored.Overview.Should().BeEmpty();
            stored.MetadataOverrides.IsEmpty.Should().BeTrue();

            Mocker.GetMock<IManageCommandQueue>()
                .Verify(v => v.Push(It.Is<RefreshAuthorCommand>(c => c.AuthorId == 4), It.IsAny<CommandPriority>(), It.IsAny<CommandTrigger>()), Times.Once());

            // A refresh put the user's overview on the cached author, so the cache has to go before that refresh runs
            Mocker.GetMock<IProvideAuthorInfo>()
                .Verify(v => v.EvictAuthor(_metadata.ForeignAuthorId), Times.Exactly(2));
        }

        [Test]
        public void should_drop_the_cached_author_when_a_book_is_edited()
        {
            var edit = EditOf(_book7);
            edit.Title = "Defiance of the Fall, Book Seven";
            _subject.UpdateBookMetadata(_book7.Id, edit);

            Mocker.GetMock<IProvideAuthorInfo>()
                .Verify(v => v.EvictAuthor(_metadata.ForeignAuthorId), Times.Once());
        }
    }
}
