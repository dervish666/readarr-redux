using FluentMigrator;
using NzbDrone.Core.Datastore.Migration.Framework;

namespace NzbDrone.Core.Datastore.Migration
{
    [Migration(042)]
    public class audio_min_release_size : NzbDroneMigrationBase
    {
        protected override void MainDbUpgrade()
        {
            // Audio qualities: Unknown Audio (13), MP3 (10), FLAC (11), M4B (12). Sizes are kilobits (x 128 bytes),
            // so 81920 is 10 MiB. AcceptableSizeSpecification now reads MinSize as a minimum total release size.
            // A minimum the user already set is left alone.
            Execute.Sql("UPDATE \"QualityDefinitions\" SET \"MinSize\" = 81920 WHERE \"Quality\" IN (10, 11, 12, 13) AND (\"MinSize\" IS NULL OR \"MinSize\" = 0)");

            // MaxSize is never enforced and the old per-second values (MP3 1262.2, M4B 1309) only mislead in the UI
            Execute.Sql("UPDATE \"QualityDefinitions\" SET \"MaxSize\" = NULL WHERE \"Quality\" IN (10, 11, 12, 13)");
        }
    }
}
