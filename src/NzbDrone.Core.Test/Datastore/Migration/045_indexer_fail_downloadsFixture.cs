using System.Linq;
using FluentAssertions;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using NzbDrone.Core.Datastore.Migration;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.Datastore.Migration
{
    [TestFixture]
    public class indexer_fail_downloadsFixture : MigrationTest<indexer_fail_downloads>
    {
        private void InsertIndexer(indexer_fail_downloads migration, string name, string implementation, string settings)
        {
            migration.Insert.IntoTable("Indexers").Row(new
            {
                Name = name,
                Implementation = implementation,
                Settings = settings,
                ConfigContract = implementation + "Settings",
                EnableRss = true,
                EnableAutomaticSearch = true,
                EnableInteractiveSearch = true,
                Priority = 25
            });
        }

        private JObject GetSettings(IDirectDataMapper db, string name)
        {
            var settings = db.Query<IndexerSettings045>($"SELECT \"Id\", \"Settings\" FROM \"Indexers\" WHERE \"Name\" = '{name}'").Single().Settings;

            return JObject.Parse(settings);
        }

        [TestCase("Newznab")]
        [TestCase("Torznab")]
        [TestCase("Nyaa")]
        [TestCase("TorrentRssIndexer")]
        public void should_turn_on_fail_downloads_for_open_indexers(string implementation)
        {
            var db = WithMigrationTestDb(c => InsertIndexer(c, "Indexer", implementation, "{\"baseUrl\": \"https://indexer.example\", \"apiPath\": \"/api\"}"));

            var settings = GetSettings(db, "Indexer");

            settings["failDownloads"].ToObject<int[]>().Should().Equal(0, 1);
            settings["baseUrl"].ToString().Should().Be("https://indexer.example");
        }

        [TestCase("FileList")]
        [TestCase("IPTorrents")]
        [TestCase("Torrentleech")]
        [TestCase("Gazelle")]
        public void should_leave_private_trackers_alone(string implementation)
        {
            var db = WithMigrationTestDb(c => InsertIndexer(c, "Indexer", implementation, "{\"baseUrl\": \"https://tracker.example\"}"));

            GetSettings(db, "Indexer").ContainsKey("failDownloads").Should().BeFalse();
        }

        [Test]
        public void should_keep_a_fail_downloads_value_already_set()
        {
            var db = WithMigrationTestDb(c => InsertIndexer(c, "Indexer", "Newznab", "{\"baseUrl\": \"https://indexer.example\", \"failDownloads\": []}"));

            GetSettings(db, "Indexer")["failDownloads"].ToObject<int[]>().Should().BeEmpty();
        }

        [Test]
        public void should_update_each_indexer()
        {
            var db = WithMigrationTestDb(c =>
            {
                InsertIndexer(c, "One", "Newznab", "{\"baseUrl\": \"https://one.example\"}");
                InsertIndexer(c, "Two", "Torznab", "{\"baseUrl\": \"https://two.example\"}");
            });

            GetSettings(db, "One")["failDownloads"].ToObject<int[]>().Should().Equal(0, 1);
            GetSettings(db, "Two")["failDownloads"].ToObject<int[]>().Should().Equal(0, 1);
        }
    }
}
