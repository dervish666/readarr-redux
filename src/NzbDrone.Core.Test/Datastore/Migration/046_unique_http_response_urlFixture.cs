using System;
using System.Linq;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.Datastore.Migration;
using NzbDrone.Core.Datastore.Migration.Framework;
using NzbDrone.Core.Http;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.Datastore.Migration
{
    [TestFixture]
    public class unique_http_response_urlFixture : MigrationTest<unique_http_response_url>
    {
        protected override MigrationType MigrationType => MigrationType.Cache;

        private static void InsertResponse(unique_http_response_url migration, string url, string value, DateTime lastRefresh)
        {
            migration.Insert.IntoTable("HttpResponse").Row(new
            {
                Url = url,
                LastRefresh = lastRefresh,
                Expiry = lastRefresh.AddDays(1),
                Value = value,
                StatusCode = 200
            });
        }

        [Test]
        public void should_keep_only_the_newest_response_for_each_url()
        {
            var now = new DateTime(2026, 11, 18, 12, 0, 0, DateTimeKind.Utc);

            var db = WithMigrationTestDb(c =>
            {
                InsertResponse(c, "http://metadata.test/work/1", "old", now.AddHours(-2));
                InsertResponse(c, "http://metadata.test/work/1", "new", now);
                InsertResponse(c, "http://metadata.test/work/1", "middle", now.AddHours(-1));
                InsertResponse(c, "http://metadata.test/work/2", "only", now.AddHours(-5));
            });

            var rows = db.Query<HttpResponse046>("SELECT \"Url\", \"Value\" FROM \"HttpResponse\"");

            rows.Should().HaveCount(2);
            rows.Single(r => r.Url.EndsWith("/work/1")).Value.Should().Be("new");
            rows.Single(r => r.Url.EndsWith("/work/2")).Value.Should().Be("only");
        }

        [Test]
        public void should_keep_the_last_inserted_of_rows_refreshed_at_the_same_time()
        {
            var now = new DateTime(2026, 11, 18, 12, 0, 0, DateTimeKind.Utc);

            var db = WithMigrationTestDb(c =>
            {
                InsertResponse(c, "http://metadata.test/work/1", "first", now);
                InsertResponse(c, "http://metadata.test/work/1", "second", now);
            });

            db.Query<HttpResponse046>("SELECT \"Url\", \"Value\" FROM \"HttpResponse\"")
                .Should().ContainSingle().Which.Value.Should().Be("second");
        }

        [Test]
        public void should_refuse_a_second_row_for_the_same_url()
        {
            WithMigrationTestDb();

            var repo = Mocker.Resolve<CachedHttpResponseRepository>();
            var now = DateTime.UtcNow;

            repo.Insert(new CachedHttpResponse { Url = "http://metadata.test/work/1", Value = "one", LastRefresh = now, Expiry = now.AddDays(1), StatusCode = 200 });

            Assert.That(() => repo.Insert(new CachedHttpResponse { Url = "http://metadata.test/work/1", Value = "two", LastRefresh = now, Expiry = now.AddDays(1), StatusCode = 200 }),
                Throws.Exception);

            repo.FindByUrl("http://metadata.test/work/1").Value.Should().Be("one");
        }

        private class HttpResponse046
        {
            public string Url { get; set; }
            public string Value { get; set; }
        }
    }
}
