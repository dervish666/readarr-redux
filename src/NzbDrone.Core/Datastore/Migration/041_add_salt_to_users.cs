using FluentMigrator;
using NzbDrone.Core.Datastore.Migration.Framework;

namespace NzbDrone.Core.Datastore.Migration
{
    [Migration(041)]
    public class add_salt_to_users : NzbDroneMigrationBase
    {
        protected override void MainDbUpgrade()
        {
            // Existing SHA-256 rows keep a null salt and are rehashed on their next successful login
            Alter.Table("Users")
                .AddColumn("Salt").AsString().Nullable()
                .AddColumn("Iterations").AsInt32().Nullable();
        }
    }
}
