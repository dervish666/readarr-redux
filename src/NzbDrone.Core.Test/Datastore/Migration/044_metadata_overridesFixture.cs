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
}
