using System.Collections.Generic;
using System.Data;
using Dapper;
using FluentMigrator;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using NzbDrone.Core.Datastore.Migration.Framework;

namespace NzbDrone.Core.Datastore.Migration
{
    // Turns Fail Downloads on for existing indexers of the types a new one gets it by default: the open usenet and
    // torrent feeds. Private trackers are left alone, as they are for a new indexer. An indexer that already has a
    // Fail Downloads value keeps it.
    [Migration(045)]
    public class indexer_fail_downloads : NzbDroneMigrationBase
    {
        private static readonly string[] Implementations = { "Newznab", "Torznab", "Nyaa", "TorrentRssIndexer" };

        // FailDownloads.Executables and FailDownloads.PotentiallyDangerous
        private static readonly int[] FailDownloads = { 0, 1 };

        protected override void MainDbUpgrade()
        {
            Execute.WithConnection(EnableFailDownloads);
        }

        private void EnableFailDownloads(IDbConnection conn, IDbTransaction tran)
        {
            var indexers = conn.Query<IndexerSettings045>("SELECT \"Id\", \"Settings\" FROM \"Indexers\" WHERE \"Implementation\" IN @Implementations",
                new { Implementations },
                transaction: tran);

            var updated = new List<object>();

            foreach (var indexer in indexers)
            {
                if (string.IsNullOrWhiteSpace(indexer.Settings))
                {
                    continue;
                }

                JObject settings;

                try
                {
                    settings = JsonConvert.DeserializeObject<JObject>(indexer.Settings);
                }
                catch (JsonException e)
                {
                    _logger.Warn(e, "Unable to read the settings of indexer {0}, not turning on Fail Downloads for it", indexer.Id);
                    continue;
                }

                if (settings == null || settings.ContainsKey("failDownloads"))
                {
                    continue;
                }

                settings["failDownloads"] = new JArray(FailDownloads);

                updated.Add(new
                {
                    indexer.Id,
                    Settings = settings.ToString(Formatting.None)
                });
            }

            conn.Execute("UPDATE \"Indexers\" SET \"Settings\" = @Settings WHERE \"Id\" = @Id", updated, transaction: tran);
        }
    }

    public class IndexerSettings045
    {
        public int Id { get; set; }
        public string Settings { get; set; }
    }
}
