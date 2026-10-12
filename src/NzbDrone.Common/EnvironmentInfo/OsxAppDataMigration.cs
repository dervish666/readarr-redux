using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Xml.Linq;
using NLog;
using NzbDrone.Common.Exceptions;
using NzbDrone.Common.Extensions;
using NzbDrone.Common.Instrumentation;

namespace NzbDrone.Common.EnvironmentInfo
{
    // From .NET 8, ApplicationData on macOS is ~/Library/Application Support instead of ~/.config, so an
    // existing install would start against a new, empty data folder. Bootstrap runs this before it reads
    // config.xml, so the moved settings (port, bind address, SSL, URL base) apply on the first start.
    public static class OsxAppDataMigration
    {
        private const string CONFIG_FILE = "config.xml";
        private const string PID_FILE = "readarr.pid";

        private static readonly Logger Logger = NzbDroneLogger.GetLogger(typeof(OsxAppDataMigration));

        public static void Migrate(IStartupContext startupContext, IAppFolderInfo appFolderInfo)
        {
            // A -data override names its own folder
            if (!OsInfo.IsOsx || startupContext.Args.ContainsKey(StartupContext.APPDATA))
            {
                return;
            }

            Migrate(GetLegacyAppDataFolder(), appFolderInfo.AppDataFolder);
        }

        // .NET 6 on macOS followed the Unix rules: an absolute XDG_CONFIG_HOME, else ~/.config
        public static string GetLegacyAppDataFolder()
        {
            var configHome = Environment.GetEnvironmentVariable("XDG_CONFIG_HOME");

            if (configHome.IsNullOrWhiteSpace() || !Path.IsPathRooted(configHome))
            {
                configHome = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile, Environment.SpecialFolderOption.DoNotVerify), ".config");
            }

            return Path.Combine(configHome, "Readarr");
        }

        public static void Migrate(string oldFolder, string newFolder)
        {
            if (!Directory.Exists(oldFolder) ||
                oldFolder.PathEquals(newFolder) ||
                File.Exists(Path.Combine(newFolder, CONFIG_FILE)))
            {
                return;
            }

            var runningPid = GetRunningPid(oldFolder);

            if (runningPid.HasValue)
            {
                throw new ReadarrStartupException("Readarr (process {0}) is still running from {1}. Stop it, then start again to move its data to {2}. If that process isn't Readarr, delete {3}",
                    runningPid.Value,
                    oldFolder,
                    newFolder,
                    Path.Combine(oldFolder, PID_FILE));
            }

            Logger.Info("Moving the data folder from {0} to {1}", oldFolder, newFolder);

            try
            {
                Directory.CreateDirectory(newFolder);
                EnsureSameFileSystem(oldFolder, newFolder);

                // Everything moves by rename, so a database never arrives half copied. config.xml goes last:
                // the check above treats it as the end of the move, so an interrupted move resumes next start.
                foreach (var source in Directory.EnumerateFileSystemEntries(oldFolder).Where(e => Path.GetFileName(e) != CONFIG_FILE).ToList())
                {
                    MoveEntry(source, Path.Combine(newFolder, Path.GetFileName(source)), true);
                }

                MoveConfig(oldFolder, newFolder);

                Directory.Delete(oldFolder);
            }
            catch (Exception ex)
            {
                throw new ReadarrStartupException(ex, "Unable to move the data folder from {0} to {1}. Move what is left of it manually", oldFolder, newFolder);
            }
        }

        private static void MoveEntry(string source, string target, bool topLevel)
        {
            if (Directory.Exists(source))
            {
                if (!Directory.Exists(target) && !File.Exists(target))
                {
                    Directory.Move(source, target);
                    return;
                }

                // The log file target has already written this start's lines to logs/ in the new folder
                // by the time Bootstrap runs, so folders that exist on both sides are merged
                if (!Directory.Exists(target))
                {
                    throw new IOException($"{target} already exists");
                }

                foreach (var child in Directory.EnumerateFileSystemEntries(source).ToList())
                {
                    MoveEntry(child, Path.Combine(target, Path.GetFileName(child)), false);
                }

                Directory.Delete(source);
                return;
            }

            if (File.Exists(target) || Directory.Exists(target))
            {
                // A clash at the top level is data (readarr.db and friends): stop rather than pick one
                if (topLevel)
                {
                    throw new IOException($"{target} already exists");
                }

                // Inside a merged folder (old logs next to this start's), keep both
                target = Path.Combine(Path.GetDirectoryName(target), $"{Path.GetFileNameWithoutExtension(target)}.migrated{Path.GetExtension(target)}");

                if (File.Exists(target) || Directory.Exists(target))
                {
                    throw new IOException($"{target} already exists");
                }
            }

            File.Move(source, target);
        }

        // Settings such as SslCertPath can point inside the data folder; follow them to the new location.
        // The rewritten copy is written beside the target and renamed into place, so the old config.xml is
        // never half written.
        private static void MoveConfig(string oldFolder, string newFolder)
        {
            var source = Path.Combine(oldFolder, CONFIG_FILE);
            var target = Path.Combine(newFolder, CONFIG_FILE);

            if (!File.Exists(source))
            {
                return;
            }

            var oldPrefix = oldFolder.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
            var document = XDocument.Load(source);
            var changed = false;

            foreach (var element in document.Root?.Elements() ?? Enumerable.Empty<XElement>())
            {
                // macOS volumes are case-insensitive by default
                if (!element.HasElements && element.Value.StartsWith(oldPrefix, StringComparison.OrdinalIgnoreCase))
                {
                    element.Value = Path.Combine(newFolder, element.Value.Substring(oldPrefix.Length));
                    changed = true;
                }
            }

            if (!changed)
            {
                File.Move(source, target);
                return;
            }

            var temp = target + ".migrating";

            using (var stream = new FileStream(temp, FileMode.Create, FileAccess.Write))
            {
                document.Save(stream);
                stream.Flush(true);
            }

            File.Move(temp, target);
            File.Delete(source);
        }

        // Directory.Move can't cross file systems, and finding that out halfway would leave the data split
        private static void EnsureSameFileSystem(string oldFolder, string newFolder)
        {
            var name = $".readarr-move-probe-{Guid.NewGuid():N}";
            var probe = Path.Combine(oldFolder, name);
            var movedProbe = Path.Combine(newFolder, name);

            Directory.CreateDirectory(probe);

            try
            {
                Directory.Move(probe, movedProbe);
            }
            catch (IOException ex)
            {
                Directory.Delete(probe);
                throw new IOException($"{oldFolder} and {newFolder} are on different file systems", ex);
            }

            Directory.Delete(movedProbe);
        }

        private static int? GetRunningPid(string folder)
        {
            var pidFile = Path.Combine(folder, PID_FILE);

            // Readarr never removes its PID file, so the process it names has to be checked
            if (!File.Exists(pidFile) || !int.TryParse(File.ReadAllText(pidFile).Trim(), out var pid) || pid == Environment.ProcessId)
            {
                return null;
            }

            try
            {
                using var process = Process.GetProcessById(pid);

                return process.ProcessName.Equals("Readarr", StringComparison.OrdinalIgnoreCase) ||
                       process.ProcessName.Equals("dotnet", StringComparison.OrdinalIgnoreCase)
                    ? pid
                    : null;
            }
            catch (ArgumentException)
            {
                // No process with that id: a PID file left by an earlier run
                return null;
            }
        }
    }
}
