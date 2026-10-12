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
        private const string MOVE_PROBE = ".readarr-move-probe";

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
                throw new ReadarrStartupException("Readarr (process {0}) is still running from {1}. Stop it, then start again to move its data to {2}", runningPid.Value, oldFolder, newFolder);
            }

            Logger.Info("Moving the data folder from {0} to {1}", oldFolder, newFolder);

            try
            {
                Directory.CreateDirectory(newFolder);
                EnsureSameFileSystem(oldFolder, newFolder);

                // Each entry moves by rename, so a database never arrives half copied. config.xml goes last:
                // the check above treats it as the end of the move, so an interrupted move resumes next start.
                var entries = Directory.EnumerateFileSystemEntries(oldFolder)
                    .OrderBy(e => Path.GetFileName(e) == CONFIG_FILE)
                    .ToList();

                foreach (var source in entries)
                {
                    var target = Path.Combine(newFolder, Path.GetFileName(source));

                    if (File.Exists(target) || Directory.Exists(target))
                    {
                        throw new IOException($"{target} already exists");
                    }

                    if (Directory.Exists(source))
                    {
                        Directory.Move(source, target);
                    }
                    else
                    {
                        if (Path.GetFileName(source) == CONFIG_FILE)
                        {
                            RewriteMovedPaths(source, oldFolder, newFolder);
                        }

                        File.Move(source, target);
                    }
                }

                Directory.Delete(oldFolder);
            }
            catch (Exception ex)
            {
                throw new ReadarrStartupException(ex, "Unable to move the data folder from {0} to {1}. Move what is left of it manually", oldFolder, newFolder);
            }
        }

        // Directory.Move can't cross file systems, and finding that out halfway would leave the data split
        private static void EnsureSameFileSystem(string oldFolder, string newFolder)
        {
            var probe = Path.Combine(oldFolder, MOVE_PROBE);
            var movedProbe = Path.Combine(newFolder, MOVE_PROBE);

            Directory.CreateDirectory(probe);

            if (Directory.Exists(movedProbe))
            {
                Directory.Delete(movedProbe, true);
            }

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

        // Settings such as SslCertPath can point inside the data folder; follow them to the new location
        private static void RewriteMovedPaths(string configFile, string oldFolder, string newFolder)
        {
            var oldPrefix = oldFolder.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
            var document = XDocument.Load(configFile);
            var changed = false;

            foreach (var element in document.Root?.Elements() ?? Enumerable.Empty<XElement>())
            {
                if (!element.HasElements && element.Value.StartsWith(oldPrefix, StringComparison.Ordinal))
                {
                    element.Value = Path.Combine(newFolder, element.Value.Substring(oldPrefix.Length));
                    changed = true;
                }
            }

            if (changed)
            {
                document.Save(configFile);
            }
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
