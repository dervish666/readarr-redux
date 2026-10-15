using System.Linq;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.Datastore.Migration;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.Datastore.Migration
{
    [TestFixture]
    public class nzb_su_url_to_nzb_lifeFixture : MigrationTest<nzb_su_url_to_nzb_life>
    {
        private void InsertIndexer(nzb_su_url_to_nzb_life migration, string name, string implementation, string baseUrl)
        {
            migration.Insert.IntoTable("Indexers").Row(new
            {
                Name = name,
                Implementation = implementation,
                Settings = $"{{\"baseUrl\": \"{baseUrl}\", \"apiPath\": \"/api\"}}",
                ConfigContract = implementation + "Settings",
                EnableRss = true,
                EnableAutomaticSearch = true,
                EnableInteractiveSearch = true,
                Priority = 25
            });
        }

        [TestCase("https://api.nzb.su", "https://api.nzb.life")]
        [TestCase("http://api.nzb.su", "http://api.nzb.life")]
        [TestCase("https://api.indexer.com", "https://api.indexer.com")]
        public void should_only_replace_nzb_su_url(string baseUrl, string expected)
        {
            var db = WithMigrationTestDb(c => InsertIndexer(c, "Indexer", "Newznab", baseUrl));

            var settings = db.Query<IndexerSettings43>("SELECT \"Settings\" FROM \"Indexers\"").Single().Settings;

            settings.Should().Contain($"\"{expected}\"");
        }

        [Test]
        public void should_not_touch_other_implementations()
        {
            var db = WithMigrationTestDb(c => InsertIndexer(c, "Torznab", "Torznab", "https://api.nzb.su"));

            var settings = db.Query<IndexerSettings43>("SELECT \"Settings\" FROM \"Indexers\"").Single().Settings;

            settings.Should().Contain("\"https://api.nzb.su\"");
        }
    }

    public class IndexerSettings43
    {
        public string Settings { get; set; }
    }
}
