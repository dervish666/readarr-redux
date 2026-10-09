using System;
using System.Linq;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.Datastore.Migration.Framework;
using NzbDrone.Core.Housekeeping.Housekeepers;
using NzbDrone.Core.Http;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.Housekeeping.Housekeepers
{
    [TestFixture]
    public class TrimHttpCacheFixture : DbTest<TrimHttpCache, CachedHttpResponse>
    {
        protected override MigrationType MigrationType => MigrationType.Cache;

        private void GivenEntry(string url, TimeSpan age, TimeSpan ttl)
        {
            var refreshed = DateTime.UtcNow - age;

            Db.Insert(new CachedHttpResponse
            {
                Url = url,
                Value = "{}",
                StatusCode = 200,
                LastRefresh = refreshed,
                Expiry = refreshed + ttl
            });
        }

        [Test]
        public void should_keep_expired_last_good_copies_for_thirty_days()
        {
            GivenEntry("http://metadata.test/search?q=recent", TimeSpan.FromDays(6), TimeSpan.FromDays(5));
            GivenEntry("http://metadata.test/series/1", TimeSpan.FromDays(29), TimeSpan.FromDays(7));
            GivenEntry("http://metadata.test/search?q=old", TimeSpan.FromDays(31), TimeSpan.FromDays(5));

            Subject.Clean();

            AllStoredModels.Select(x => x.Url).Should().BeEquivalentTo("http://metadata.test/search?q=recent", "http://metadata.test/series/1");
        }

        [Test]
        public void should_drop_short_lived_entries_once_expired()
        {
            // Author bodies: large, kept 30 minutes, and never served stale to a refresh
            GivenEntry("http://metadata.test/author/1", TimeSpan.FromHours(2), TimeSpan.FromMinutes(30));
            GivenEntry("http://metadata.test/author/2", TimeSpan.FromMinutes(5), TimeSpan.FromMinutes(30));

            Subject.Clean();

            AllStoredModels.Select(x => x.Url).Should().BeEquivalentTo("http://metadata.test/author/2");
        }
    }
}
