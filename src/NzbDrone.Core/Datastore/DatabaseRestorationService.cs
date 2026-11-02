using System;
using System.Collections.Generic;
using NLog;
using NzbDrone.Common.Disk;
using NzbDrone.Common.EnvironmentInfo;
using NzbDrone.Common.Extensions;
using NzbDrone.Common.Instrumentation;
using NzbDrone.Core.Lifecycle;
using NzbDrone.Core.Messaging.Events;

namespace NzbDrone.Core.Datastore
{
    public interface IRestoreDatabase
    {
        bool Restore();
        void RollBack();
    }

    public class DatabaseRestorationService : IRestoreDatabase, IHandleAsync<ApplicationStartedEvent>
    {
        private const string PreRestoreSuffix = ".pre-restore";
        private const string RestoreFailedSuffix = ".restore-failed";
        private static readonly string[] DatabaseFileSuffixes = { "", "-shm", "-wal", "-journal" };

        private readonly IDiskProvider _diskProvider;
        private readonly IAppFolderInfo _appFolderInfo;
        private static readonly Logger Logger = NzbDroneLogger.GetLogger(typeof(DatabaseRestorationService));

        public DatabaseRestorationService(IDiskProvider diskProvider, IAppFolderInfo appFolderInfo)
        {
            _diskProvider = diskProvider;
            _appFolderInfo = appFolderInfo;
        }

        public bool Restore()
        {
            var dbRestorePath = _appFolderInfo.GetDatabaseRestore();

            if (!_diskProvider.FileExists(dbRestorePath))
            {
                return false;
            }

            var dbPath = _appFolderInfo.GetDatabase();
            var movedSuffixes = new List<string>();

            // A .pre-restore database is only removed once the app has started, so if one is still here the current
            // database is an earlier restore that never got the app started. Keep the .pre-restore database, it is
            // the last one known to work, and set the current one aside instead.
            var asideSuffix = _diskProvider.FileExists(dbPath + PreRestoreSuffix) ? RestoreFailedSuffix : PreRestoreSuffix;

            try
            {
                Logger.Info("Restoring Database");

                if (asideSuffix == RestoreFailedSuffix)
                {
                    Logger.Warn("An earlier restore never finished starting, keeping {0} and moving the current database to {1}", dbPath + PreRestoreSuffix, dbPath + RestoreFailedSuffix);
                }

                foreach (var suffix in DatabaseFileSuffixes)
                {
                    _diskProvider.DeleteFile(dbPath + asideSuffix + suffix);

                    if (_diskProvider.FileExists(dbPath + suffix))
                    {
                        _diskProvider.MoveFile(dbPath + suffix, dbPath + asideSuffix + suffix);
                        movedSuffixes.Add(suffix);
                    }
                }

                _diskProvider.MoveFile(dbRestorePath, dbPath);
            }
            catch (Exception e)
            {
                Logger.Error(e, "Failed to restore database");

                foreach (var suffix in movedSuffixes)
                {
                    _diskProvider.MoveFile(dbPath + asideSuffix + suffix, dbPath + suffix, true);
                }

                throw;
            }

            return true;
        }

        // Called when the database just restored fails to open or migrate. Puts the database from before the restore
        // back so the next start uses it, rather than failing on the restored one every time.
        public void RollBack()
        {
            var dbPath = _appFolderInfo.GetDatabase();

            if (!_diskProvider.FileExists(dbPath + PreRestoreSuffix))
            {
                Logger.Error("The restored database failed to open and there is no database from before the restore to go back to");
                return;
            }

            try
            {
                Logger.Error("The restored database failed to open, going back to the database from before the restore. The restored database is kept as {0}", dbPath + RestoreFailedSuffix);

                foreach (var suffix in DatabaseFileSuffixes)
                {
                    _diskProvider.DeleteFile(dbPath + RestoreFailedSuffix + suffix);

                    if (_diskProvider.FileExists(dbPath + suffix))
                    {
                        _diskProvider.MoveFile(dbPath + suffix, dbPath + RestoreFailedSuffix + suffix);
                    }
                }

                foreach (var suffix in DatabaseFileSuffixes)
                {
                    if (_diskProvider.FileExists(dbPath + PreRestoreSuffix + suffix))
                    {
                        _diskProvider.MoveFile(dbPath + PreRestoreSuffix + suffix, dbPath + suffix);
                    }
                }
            }
            catch (Exception e)
            {
                Logger.Error(e, "Failed to go back to the database from before the restore, it is at {0}", dbPath + PreRestoreSuffix);
            }
        }

        public void HandleAsync(ApplicationStartedEvent message)
        {
            var dbPath = _appFolderInfo.GetDatabase();

            foreach (var suffix in DatabaseFileSuffixes)
            {
                _diskProvider.DeleteFile(dbPath + PreRestoreSuffix + suffix);
            }
        }
    }
}
