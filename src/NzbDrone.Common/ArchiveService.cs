using System;
using System.Collections.Generic;
using System.IO;
using ICSharpCode.SharpZipLib.Core;
using ICSharpCode.SharpZipLib.GZip;
using ICSharpCode.SharpZipLib.Tar;
using ICSharpCode.SharpZipLib.Zip;
using NLog;

namespace NzbDrone.Common
{
    public interface IArchiveService
    {
        void Extract(string compressedFile, string destination);
        void ExtractRootFiles(string compressedFile, string destination, IEnumerable<string> fileNames);
        void CreateZip(string path, IEnumerable<string> files);
    }

    public class ArchiveService : IArchiveService
    {
        private readonly Logger _logger;

        public ArchiveService(Logger logger)
        {
            _logger = logger;
        }

        public void Extract(string compressedFile, string destination)
        {
            _logger.Debug("Extracting archive [{0}] to [{1}]", compressedFile, destination);

            if (compressedFile.EndsWith(".zip", StringComparison.InvariantCultureIgnoreCase))
            {
                ExtractZip(compressedFile, destination);
            }
            else
            {
                ExtractTgz(compressedFile, destination);
            }

            _logger.Debug("Extraction complete.");
        }

        public void ExtractRootFiles(string compressedFile, string destination, IEnumerable<string> fileNames)
        {
            var allowed = new HashSet<string>(fileNames, StringComparer.OrdinalIgnoreCase);

            _logger.Debug("Extracting [{0}] from archive [{1}] to [{2}]", string.Join(", ", allowed), compressedFile, destination);

            // Entry names use '/', so a match on the whole name only accepts files at the root
            ExtractZip(compressedFile, destination, entry => allowed.Contains(entry.Name));

            _logger.Debug("Extraction complete.");
        }

        public void CreateZip(string path, IEnumerable<string> files)
        {
            _logger.Debug("Creating archive {0}", path);

            using var zipFile = ZipFile.Create(path);

            zipFile.BeginUpdate();

            foreach (var file in files)
            {
                zipFile.Add(file, Path.GetFileName(file));
            }

            zipFile.CommitUpdate();
        }

        private void ExtractZip(string compressedFile, string destination, Func<ZipEntry, bool> include = null)
        {
            using (var fileStream = File.OpenRead(compressedFile))
            {
                var zipFile = new ZipFile(fileStream);

                _logger.Debug("Validating Archive {0}", compressedFile);

                if (!zipFile.TestArchive(true, TestStrategy.FindFirstError, OnZipError))
                {
                    throw new IOException(string.Format("File {0} failed archive validation.", compressedFile));
                }

                var destinationRoot = GetDestinationRoot(destination);
                var entries = new List<(ZipEntry Entry, string Path)>();

                // Check every entry before writing any, so a hostile archive leaves nothing behind
                foreach (ZipEntry zipEntry in zipFile)
                {
                    if (!zipEntry.IsFile)
                    {
                        continue; // Ignore directories
                    }

                    var fullZipToPath = GetContainedPath(destinationRoot, destination, zipEntry.Name);

                    if (include == null || include(zipEntry))
                    {
                        entries.Add((zipEntry, fullZipToPath));
                    }
                }

                foreach (var (zipEntry, fullZipToPath) in entries)
                {
                    var buffer = new byte[4096]; // 4K is optimum
                    var zipStream = zipFile.GetInputStream(zipEntry);
                    var directoryName = Path.GetDirectoryName(fullZipToPath);

                    if (directoryName.Length > 0)
                    {
                        Directory.CreateDirectory(directoryName);
                    }

                    // Unzip file in buffered chunks. This is just as fast as unpacking to a buffer the full size
                    // of the file, but does not waste memory.
                    // The "using" will close the stream even if an exception occurs.
                    using (var streamWriter = File.Create(fullZipToPath))
                    {
                        StreamUtils.Copy(zipStream, streamWriter, buffer);
                    }
                }
            }
        }

        private void ExtractTgz(string compressedFile, string destination)
        {
            ValidateTgz(compressedFile, destination);

            Stream inStream = File.OpenRead(compressedFile);
            Stream gzipStream = new GZipInputStream(inStream);

            var tarArchive = TarArchive.CreateInputTarArchive(gzipStream, null);
            tarArchive.ExtractContents(destination);
            tarArchive.Close();

            gzipStream.Close();
            inStream.Close();
        }

        // TarArchive rejects "../" itself, but it compares without a trailing separator, so an entry
        // aimed at a sibling folder that shares the destination's name as a prefix gets through.
        private void ValidateTgz(string compressedFile, string destination)
        {
            var destinationRoot = GetDestinationRoot(destination);

            using (var inStream = File.OpenRead(compressedFile))
            using (var gzipStream = new GZipInputStream(inStream))
            using (var tarStream = new TarInputStream(gzipStream, null))
            {
                TarEntry entry;

                while ((entry = tarStream.GetNextEntry()) != null)
                {
                    // TarArchive skips links and strips a leading root, so mirror both
                    if (entry.TarHeader.TypeFlag == TarHeader.LF_LINK || entry.TarHeader.TypeFlag == TarHeader.LF_SYMLINK)
                    {
                        continue;
                    }

                    var name = entry.Name;

                    if (Path.IsPathRooted(name))
                    {
                        name = name.Substring(Path.GetPathRoot(name).Length);
                    }

                    GetContainedPath(destinationRoot, destination, name.Replace('/', Path.DirectorySeparatorChar));
                }
            }
        }

        private static string GetDestinationRoot(string destination)
        {
            return Path.GetFullPath(destination).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        }

        private static string GetContainedPath(string destinationRoot, string destination, string entryName)
        {
            var fullPath = Path.GetFullPath(Path.Combine(destination, entryName));

            // The separator lets a "./" directory entry resolve to the destination itself
            if (!(fullPath + Path.DirectorySeparatorChar).StartsWith(destinationRoot, StringComparison.Ordinal))
            {
                throw new IOException($"Entry is outside the target dir: {entryName}");
            }

            return fullPath;
        }

        private void OnZipError(TestStatus status, string message)
        {
            if (!string.IsNullOrWhiteSpace(message))
            {
                _logger.Error("File {0} failed zip validation. {1}", status.File.Name, message);
            }
        }
    }
}
