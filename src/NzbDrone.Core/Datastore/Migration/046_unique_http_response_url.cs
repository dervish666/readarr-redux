using FluentMigrator;
using NzbDrone.Core.Datastore.Migration.Framework;

namespace NzbDrone.Core.Datastore.Migration
{
    // CachedHttpResponseService looked a url up, fetched it, then inserted when the lookup had missed. Two requests for
    // the same url at once both inserted, and FindByUrl's SingleOrDefault then threw on every later lookup of it.
    // Keep the newest row per url and make Url unique so a duplicate cannot get in again.
    [Migration(046)]
    public class unique_http_response_url : NzbDroneMigrationBase
    {
        protected override void CacheDbUpgrade()
        {
            Execute.Sql("DELETE FROM \"HttpResponse\" WHERE EXISTS (" +
                        "SELECT 1 FROM \"HttpResponse\" AS \"Newer\" WHERE \"Newer\".\"Url\" = \"HttpResponse\".\"Url\" AND " +
                        "(\"Newer\".\"LastRefresh\" > \"HttpResponse\".\"LastRefresh\" OR " +
                        "(\"Newer\".\"LastRefresh\" = \"HttpResponse\".\"LastRefresh\" AND \"Newer\".\"Id\" > \"HttpResponse\".\"Id\")))");

            Delete.Index("IX_HttpResponse_Url").OnTable("HttpResponse");
            Create.Index("IX_HttpResponse_Url").OnTable("HttpResponse").OnColumn("Url").Ascending().WithOptions().Unique();
        }
    }
}
