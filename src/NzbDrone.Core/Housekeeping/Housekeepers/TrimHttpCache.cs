using System;
using System.Linq;
using Dapper;
using NzbDrone.Core.Datastore;

namespace NzbDrone.Core.Housekeeping.Housekeepers
{
    public class TrimHttpCache : IHousekeepingTask
    {
        // Expired entries are the last good copies stale-on-error falls back to (search, series, lists), so they stay
        // for 30 days. Short-lived ones go once expired: author bodies (30 minutes) are the large entries, and a
        // refresh never takes a stale author anyway.
        private static readonly TimeSpan KeepLastGood = TimeSpan.FromDays(30);
        private static readonly TimeSpan ShortLived = TimeSpan.FromDays(1);

        private readonly ICacheDatabase _database;

        public TrimHttpCache(ICacheDatabase database)
        {
            _database = database;
        }

        public void Clean()
        {
            var now = DateTime.UtcNow;

            using (var mapper = _database.OpenConnection())
            {
                var ids = mapper.Query<Entry>(@"SELECT ""Id"", ""LastRefresh"", ""Expiry"" FROM ""HttpResponse""")
                    .Where(x => x.LastRefresh < now - KeepLastGood || (x.Expiry < now && x.Expiry - x.LastRefresh < ShortLived))
                    .Select(x => x.Id)
                    .ToList();

                foreach (var batch in ids.Chunk(500))
                {
                    mapper.Execute(@"DELETE FROM ""HttpResponse"" WHERE ""Id"" IN @Ids", new { Ids = batch });
                }
            }

            _database.Vacuum();
        }

        private class Entry
        {
            public int Id { get; set; }
            public DateTime LastRefresh { get; set; }
            public DateTime Expiry { get; set; }
        }
    }
}
