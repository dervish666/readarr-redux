using System.Linq;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.Datastore.Migration;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.Datastore.Migration
{
    [TestFixture]
    public class audio_min_release_sizeFixture : MigrationTest<audio_min_release_size>
    {
        // 10 MiB in the kilobit units QualityDefinitions use (x 128 bytes)
        private const double TenMegabytes = 81920;

        private void InsertDefinition(audio_min_release_size migration, int quality, string title, double? minSize, double? maxSize)
        {
            migration.Insert.IntoTable("QualityDefinitions").Row(new
            {
                Quality = quality,
                Title = title,
                MinSize = minSize,
                MaxSize = maxSize
            });
        }

        [Test]
        public void should_set_audio_minimum_only_where_unset_and_clear_audio_maximum()
        {
            var db = WithMigrationTestDb(c =>
            {
                InsertDefinition(c, 0, "Unknown Text", 0, 350);
                InsertDefinition(c, 3, "EPUB", 0, 350);
                InsertDefinition(c, 10, "MP3", 0, 1262.2);
                InsertDefinition(c, 11, "FLAC", 163840, null);
                InsertDefinition(c, 12, "M4B", null, 1309);
                InsertDefinition(c, 13, "Unknown Audio", 0, 350);
            });

            var definitions = db.Query<QualityDefinition42>("SELECT * FROM \"QualityDefinitions\"").ToDictionary(d => d.Quality);

            definitions[10].MinSize.Should().Be(TenMegabytes);
            definitions[10].MaxSize.Should().BeNull();

            definitions[11].MinSize.Should().Be(163840, "a user's own minimum is never overwritten");
            definitions[11].MaxSize.Should().BeNull();

            definitions[12].MinSize.Should().Be(TenMegabytes);
            definitions[12].MaxSize.Should().BeNull();

            definitions[13].MinSize.Should().Be(TenMegabytes);
            definitions[13].MaxSize.Should().BeNull();

            definitions[0].MinSize.Should().Be(0);
            definitions[0].MaxSize.Should().Be(350);

            definitions[3].MinSize.Should().Be(0);
            definitions[3].MaxSize.Should().Be(350);
        }

        [Test]
        public void should_do_nothing_on_a_new_install()
        {
            var db = WithMigrationTestDb();

            db.Query<QualityDefinition42>("SELECT * FROM \"QualityDefinitions\"").Should().BeEmpty();
        }
    }

    public class QualityDefinition42
    {
        public int Id { get; set; }
        public int Quality { get; set; }
        public string Title { get; set; }
        public double? MinSize { get; set; }
        public double? MaxSize { get; set; }
    }
}
