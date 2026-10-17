using System.Linq;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.Datastore.Migration;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.Datastore.Migration
{
    [TestFixture]
    public class metadata_overridesFixture : MigrationTest<metadata_overrides>
    {
        [Test]
        public void should_mark_existing_series_links_as_from_the_metadata_source()
        {
            var db = WithMigrationTestDb(c =>
            {
                c.Insert.IntoTable("SeriesBookLink").Row(new
                {
                    SeriesId = 1,
                    BookId = 1,
                    Position = "1",
                    SeriesPosition = 1,
                    IsPrimary = true
                });
            });

            db.Query<SeriesBookLink44>("SELECT \"IsManual\" FROM \"SeriesBookLink\"").Single().IsManual.Should().BeFalse();
        }

        [Test]
        public void should_keep_existing_books_and_authors_and_leave_them_without_overrides()
        {
            var db = WithMigrationTestDb(c =>
            {
                c.Insert.IntoTable("AuthorMetadata").Row(new
                {
                    ForeignAuthorId = "17113212",
                    TitleSlug = "17113212",
                    Name = "TheFirstDefier",
                    Overview = "From the source",
                    Status = 0,
                    Images = "[]",
                    Aliases = "[]",
                    SortName = "thefirstdefier",
                    NameLastFirst = "TheFirstDefier",
                    SortNameLastFirst = "thefirstdefier"
                });

                c.Insert.IntoTable("Books").Row(new
                {
                    AuthorMetadataId = 1,
                    ForeignBookId = "57560",
                    TitleSlug = "57560",
                    Title = "Defiance of the Fall",
                    CleanTitle = "defiancefall",
                    Monitored = true,
                    AnyEditionOk = true,
                    RelatedBooks = "[]"
                });
            });

            var book = db.Query<Book44>("SELECT \"Title\", \"ForeignBookId\", \"Monitored\", \"MetadataOverrides\" FROM \"Books\"").Single();
            book.Title.Should().Be("Defiance of the Fall");
            book.ForeignBookId.Should().Be("57560");
            book.Monitored.Should().BeTrue();
            book.MetadataOverrides.Should().BeNull();

            var author = db.Query<Author44>("SELECT \"Name\", \"Overview\", \"MetadataOverrides\" FROM \"AuthorMetadata\"").Single();
            author.Name.Should().Be("TheFirstDefier");
            author.Overview.Should().Be("From the source");
            author.MetadataOverrides.Should().BeNull();
        }

        [Test]
        public void should_add_empty_override_columns()
        {
            var db = WithMigrationTestDb();

            db.Query<Overrides44>("SELECT \"MetadataOverrides\" FROM \"Books\"").Should().BeEmpty();
            db.Query<Overrides44>("SELECT \"MetadataOverrides\" FROM \"AuthorMetadata\"").Should().BeEmpty();
        }
    }

    public class SeriesBookLink44
    {
        public bool IsManual { get; set; }
    }

    public class Overrides44
    {
        public string MetadataOverrides { get; set; }
    }

    public class Book44
    {
        public string Title { get; set; }
        public string ForeignBookId { get; set; }
        public bool Monitored { get; set; }
        public string MetadataOverrides { get; set; }
    }

    public class Author44
    {
        public string Name { get; set; }
        public string Overview { get; set; }
        public string MetadataOverrides { get; set; }
    }
}
