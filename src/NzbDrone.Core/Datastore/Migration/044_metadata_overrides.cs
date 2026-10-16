using FluentMigrator;
using NzbDrone.Core.Datastore.Migration.Framework;

namespace NzbDrone.Core.Datastore.Migration
{
    [Migration(044)]
    public class metadata_overrides : NzbDroneMigrationBase
    {
        protected override void MainDbUpgrade()
        {
            // Book and author values the user set by hand, kept over the metadata source's on refresh
            Alter.Table("Books").AddColumn("MetadataOverrides").AsString().Nullable();
            Alter.Table("AuthorMetadata").AddColumn("MetadataOverrides").AsString().Nullable();

            // Series links the user added or repositioned, which a refresh leaves alone
            Alter.Table("SeriesBookLink").AddColumn("IsManual").AsBoolean().WithDefaultValue(false);
        }
    }
}
