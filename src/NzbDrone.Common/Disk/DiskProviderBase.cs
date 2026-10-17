using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Abstractions;
using System.Linq;
using System.Threading;
using NLog;
using NzbDrone.Common.EnsureThat;
using NzbDrone.Common.EnvironmentInfo;
using NzbDrone.Common.Extensions;
using NzbDrone.Common.Instrumentation;

namespace NzbDrone.Common.Disk
{
    public abstract class DiskProviderBase : IDiskProvider
    {
        private static readonly Logger Logger = NzbDroneLogger.GetLogger(typeof(DiskProviderBase));
        protected readonly IFileSystem _fileSystem;

        public DiskProviderBase(IFileSystem fileSystem)
        {
            _fileSystem = fileSystem;
        }

        public static StringComparison PathStringComparison
        {
            get
            {
                if (OsInfo.IsWindows)
                {
                    return StringComparison.OrdinalIgnoreCase;
                }

                return StringComparison.Ordinal;
            }
        }

        public abstract long? GetAvailableSpace(string path);
        public abstract void InheritFolderPermissions(string filename);
        public abstract void SetEveryonePermissions(string filename);
        public abstract void SetFilePermissions(string path, string mask, string group);
        public abstract void SetPermissions(string path, string mask, string group);
        public abstract void CopyPermissions(string sourcePath, string targetPath);
        public abstract long? GetTotalSize(string path);

        public DateTime FolderGetCreationTime(string path)
        {
            CheckFolderExists(path);

            return _fileSystem.DirectoryInfo.FromDirectoryName(path).CreationTimeUtc;
        }

        public DateTime FolderGetLastWrite(string path)
        {
            CheckFolderExists(path);

            var dirFiles = GetFiles(path, true).ToList();

            if (!dirFiles.Any())
            {
                return _fileSystem.DirectoryInfo.FromDirectoryName(path).LastWriteTimeUtc;
            }

            return dirFiles.Select(f => _fileSystem.FileInfo.FromFileName(f)).Max(c => c.LastWriteTimeUtc);
        }

        public DateTime FileGetLastWrite(string path)
        {
            CheckFileExists(path);

            return _fileSystem.FileInfo.FromFileName(path).LastWriteTimeUtc;
        }

        private void CheckFolderExists(string path)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);

            if (!FolderExists(path))
            {
                throw new DirectoryNotFoundException("Directory doesn't exist. " + path);
            }
        }

        private void CheckFileExists(string path)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);

            if (!FileExists(path))
            {
                throw new FileNotFoundException("File doesn't exist: " + path);
            }
        }

        public void EnsureFolder(string path)
        {
            if (!FolderExists(path))
            {
                CreateFolder(path);
            }
        }

        public bool FolderExists(string path)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);
            return _fileSystem.Directory.Exists(path);
        }

        public bool FileExists(string path)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);
            return FileExists(path, PathStringComparison);
        }

        public bool FileExists(string path, StringComparison stringComparison)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);

            switch (stringComparison)
            {
                case StringComparison.CurrentCulture:
                case StringComparison.InvariantCulture:
                case StringComparison.Ordinal:
                    {
                        return _fileSystem.File.Exists(path) && path == path.GetActualCasing();
                    }

                default:
                    {
                        return _fileSystem.File.Exists(path);
                    }
            }
        }

        public bool FolderWritable(string path)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);

            try
            {
                var testPath = Path.Combine(path, "readarr_write_test.txt");
                var testContent = $"This file was created to verify if '{path}' is writable. It should've been automatically deleted. Feel free to delete it.";
                WriteAllText(testPath, testContent);
                _fileSystem.File.Delete(testPath);
                return true;
            }
            catch (Exception e)
            {
                Logger.Trace("Directory '{0}' isn't writable. {1}", path, e.Message);
                return false;
            }
        }

        public bool FolderEmpty(string path)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);

            return _fileSystem.Directory.EnumerateFileSystemEntries(path).Empty();
        }

        public IEnumerable<string> GetDirectories(string path)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);

            return _fileSystem.Directory.EnumerateDirectories(path);
        }

        public string[] GetDirectories(string path, SearchOption searchOption)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);

            return _fileSystem.Directory.GetDirectories(path, "*", searchOption);
        }

        public IEnumerable<string> GetFiles(string path, bool recursive)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);

            return _fileSystem.Directory.EnumerateFiles(path, "*", new EnumerationOptions
            {
                RecurseSubdirectories = recursive,
                IgnoreInaccessible = true
            });
        }

        // Every file under path, hidden and dot-folders included, throwing on a folder that can't be read or that
        // disappears while it is listed. GetFiles skips hidden entries and unreadable folders, which is right for
        // scanning and wrong for proving nothing was left behind.
        public List<string> GetAllFilesOrThrow(string path)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);

            return WalkFiles(path, true, new List<string>());
        }

        // Directory symlinks and junctions anywhere under path, which GetAllFilesOrThrow and DeleteFolder never enter
        public List<string> GetDirectoryLinks(string path)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);

            var links = new List<string>();
            WalkFiles(path, true, links);

            return links;
        }

        // Every file under path, hidden ones included, without entering directory links. Unreadable folders are
        // passed over, as GetFiles does. For walks that change or delete what they find.
        public IEnumerable<string> GetFilesNotFollowingLinks(string path)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);

            return WalkFiles(path, false, new List<string>());
        }

        // Lists files one folder at a time. The built-in recursion follows directory symlinks (a loop lists the
        // same files over and over) and skips a subfolder that vanishes mid-listing. A directory link is recorded
        // in links and not entered. With throwOnError a folder that is gone or unreadable throws; without, it is
        // passed over, as GetFiles does.
        private List<string> WalkFiles(string path, bool throwOnError, List<string> links)
        {
            var options = new EnumerationOptions
            {
                RecurseSubdirectories = false,
                IgnoreInaccessible = !throwOnError,
                AttributesToSkip = 0
            };

            var files = new List<string>();
            var folders = new Stack<string>();
            folders.Push(path);

            while (folders.Count > 0)
            {
                var folder = folders.Pop();

                if (!_fileSystem.Directory.Exists(folder))
                {
                    if (throwOnError)
                    {
                        throw new DirectoryNotFoundException($"{folder} disappeared while it was being listed");
                    }

                    continue;
                }

                files.AddRange(_fileSystem.Directory.EnumerateFiles(folder, "*", options));

                foreach (var child in _fileSystem.Directory.EnumerateDirectories(folder, "*", options))
                {
                    if (IsDirectoryLink(child))
                    {
                        links.Add(child);
                        continue;
                    }

                    folders.Push(child);
                }
            }

            return files;
        }

        public bool IsDirectoryLink(string path)
        {
            return _fileSystem.DirectoryInfo.FromDirectoryName(path).Attributes.HasFlag(FileAttributes.ReparsePoint);
        }

        // Removes the link itself. Its target, outside the folder being deleted, is never touched.
        private void DeleteDirectoryLink(string path)
        {
            if (OsInfo.IsWindows)
            {
                _fileSystem.Directory.Delete(path, false);
            }
            else
            {
                _fileSystem.File.Delete(path);
            }
        }

        public long GetFolderSize(string path)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);

            return GetFiles(path, true).Sum(e => _fileSystem.FileInfo.FromFileName(e).Length);
        }

        public long GetFileSize(string path)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);

            if (!FileExists(path))
            {
                throw new FileNotFoundException("File doesn't exist: " + path);
            }

            var fi = _fileSystem.FileInfo.FromFileName(path);
            return fi.Length;
        }

        public void CreateFolder(string path)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);
            _fileSystem.Directory.CreateDirectory(path);
        }

        public void DeleteFile(string path)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);
            Logger.Trace("Deleting file: {0}", path);

            RemoveReadOnly(path);

            _fileSystem.File.Delete(path);
        }

        public void CloneFile(string source, string destination, bool overwrite = false)
        {
            Ensure.That(source, () => source).IsValidPath(PathValidationType.CurrentOs);
            Ensure.That(destination, () => destination).IsValidPath(PathValidationType.CurrentOs);

            if (source.PathEquals(destination))
            {
                throw new IOException(string.Format("Source and destination can't be the same {0}", source));
            }

            CloneFileInternal(source, destination, overwrite);
        }

        protected virtual void CloneFileInternal(string source, string destination, bool overwrite = false)
        {
            CopyFileInternal(source, destination, overwrite);
        }

        public void CopyFile(string source, string destination, bool overwrite = false)
        {
            Ensure.That(source, () => source).IsValidPath(PathValidationType.CurrentOs);
            Ensure.That(destination, () => destination).IsValidPath(PathValidationType.CurrentOs);

            if (source.PathEquals(destination))
            {
                throw new IOException(string.Format("Source and destination can't be the same {0}", source));
            }

            CopyFileInternal(source, destination, overwrite);
        }

        protected virtual void CopyFileInternal(string source, string destination, bool overwrite = false)
        {
            _fileSystem.File.Copy(source, destination, overwrite);
        }

        public void MoveFile(string source, string destination, bool overwrite = false)
        {
            Ensure.That(source, () => source).IsValidPath(PathValidationType.CurrentOs);
            Ensure.That(destination, () => destination).IsValidPath(PathValidationType.CurrentOs);

            if (source.PathEquals(destination))
            {
                throw new IOException(string.Format("Source and destination can't be the same {0}", source));
            }

            if (FileExists(destination) && overwrite)
            {
                DeleteFile(destination);
            }

            RemoveReadOnly(source);
            MoveFileInternal(source, destination);
        }

        public void MoveFolder(string source, string destination)
        {
            Ensure.That(source, () => source).IsValidPath(PathValidationType.CurrentOs);
            Ensure.That(destination, () => destination).IsValidPath(PathValidationType.CurrentOs);

            Directory.Move(source, destination);
        }

        protected virtual void MoveFileInternal(string source, string destination)
        {
            if (File.Exists(destination))
            {
                throw new FileAlreadyExistsException("File already exists", destination);
            }

            _fileSystem.File.Move(source, destination);
        }

        public virtual bool TryRenameFile(string source, string destination)
        {
            return false;
        }

        public abstract bool TryCreateHardLink(string source, string destination);

        public virtual bool TryCreateRefLink(string source, string destination)
        {
            return false;
        }

        public void DeleteFolder(string path, bool recursive)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);

            // A directory symlink or junction is removed as a link. Deleting through it would empty its target,
            // which can be anywhere: a hidden .extras pointing at the library, for one.
            if (IsDirectoryLink(path))
            {
                DeleteDirectoryLink(path);
                return;
            }

            var links = new List<string>();
            var files = ListFilesForDelete(path, recursive, links);

            files.ForEach(RemoveReadOnly);
            links.ForEach(DeleteDirectoryLink);

            var attempts = 0;

            while (attempts < 3 && files.Any())
            {
                EmptyFolder(path);

                if (ListFilesForDelete(path, recursive, new List<string>()).Any())
                {
                    // Wait for IO operations to complete  after emptying the folder since they aren't always
                    // instantly removed and it can lead to false positives that files are still present.
                    Thread.Sleep(3000);
                }

                attempts++;
                files = ListFilesForDelete(path, recursive, new List<string>());
            }

            _fileSystem.Directory.Delete(path, recursive);
        }

        // Removes the folder only if it holds nothing. Unlike DeleteFolder, it never deletes what's inside: the OS
        // refuses a folder that isn't empty, so a file that arrives after any earlier check is safe.
        private List<string> ListFilesForDelete(string path, bool recursive, List<string> links)
        {
            return recursive ? WalkFiles(path, false, links) : GetFiles(path, false).ToList();
        }

        public void DeleteEmptyFolder(string path)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);

            _fileSystem.Directory.Delete(path, false);
        }

        public string ReadAllText(string filePath)
        {
            Ensure.That(filePath, () => filePath).IsValidPath(PathValidationType.CurrentOs);

            return _fileSystem.File.ReadAllText(filePath);
        }

        public void WriteAllText(string filename, string contents)
        {
            Ensure.That(filename, () => filename).IsValidPath(PathValidationType.CurrentOs);
            RemoveReadOnly(filename);

            // File.WriteAllText is broken on net core when writing to some CIFS mounts
            // This workaround from https://github.com/dotnet/runtime/issues/42790#issuecomment-700362617
            using (var fs = new FileStream(filename, FileMode.Create, FileAccess.Write, FileShare.None))
            {
                using (var writer = new StreamWriter(fs))
                {
                    writer.Write(contents);
                }
            }
        }

        public void FolderSetLastWriteTime(string path, DateTime dateTime)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);

            _fileSystem.Directory.SetLastWriteTimeUtc(path, dateTime);
        }

        public void FileSetLastWriteTime(string path, DateTime dateTime)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);

            _fileSystem.File.SetLastWriteTime(path, dateTime);
        }

        public bool IsFileLocked(string file)
        {
            try
            {
                using (_fileSystem.File.Open(file, FileMode.Open, FileAccess.Read, FileShare.None))
                {
                    return false;
                }
            }
            catch (IOException)
            {
                return true;
            }
        }

        public string GetPathRoot(string path)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);

            return Path.GetPathRoot(path);
        }

        public string GetParentFolder(string path)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);

            var parent = _fileSystem.Directory.GetParent(path.TrimEnd(Path.DirectorySeparatorChar));

            if (parent == null)
            {
                return null;
            }

            return parent.FullName;
        }

        private static void RemoveReadOnly(string path)
        {
            if (File.Exists(path))
            {
                var attributes = File.GetAttributes(path);

                if (attributes.HasFlag(FileAttributes.ReadOnly))
                {
                    var newAttributes = attributes & ~FileAttributes.ReadOnly;
                    File.SetAttributes(path, newAttributes);
                }
            }
        }

        public FileAttributes GetFileAttributes(string path)
        {
            return _fileSystem.File.GetAttributes(path);
        }

        public void EmptyFolder(string path)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);

            // Emptying a directory link would empty its target, which can be anywhere
            if (IsDirectoryLink(path))
            {
                Logger.Warn("Not emptying {0}: it is a link to another folder, which is left as it is", path);
                return;
            }

            foreach (var file in GetFiles(path, false))
            {
                DeleteFile(file);
            }

            foreach (var directory in GetDirectories(path))
            {
                // DeleteFolder removes a directory link as a link, without entering it
                DeleteFolder(directory, true);
            }
        }

        public string[] GetFixedDrives()
        {
            return GetMounts().Where(x => x.DriveType == DriveType.Fixed).Select(x => x.RootDirectory).ToArray();
        }

        public string GetVolumeLabel(string path)
        {
            var driveInfo = GetMounts().SingleOrDefault(d => d.RootDirectory.PathEquals(path));

            if (driveInfo == null)
            {
                return null;
            }

            return driveInfo.VolumeLabel;
        }

        public FileStream OpenReadStream(string path)
        {
            if (!FileExists(path))
            {
                throw new FileNotFoundException("Unable to find file: " + path, path);
            }

            return (FileStream)_fileSystem.FileStream.Create(path, FileMode.Open, FileAccess.Read);
        }

        public FileStream OpenWriteStream(string path)
        {
            return (FileStream)_fileSystem.FileStream.Create(path, FileMode.Create);
        }

        public List<IMount> GetMounts()
        {
            return GetAllMounts().Where(d => !IsSpecialMount(d)).ToList();
        }

        protected virtual List<IMount> GetAllMounts()
        {
            return GetDriveInfoMounts().Where(d => d.DriveType == DriveType.Fixed || d.DriveType == DriveType.Network || d.DriveType == DriveType.Removable)
                                       .Select(d => new DriveInfoMount(d))
                                       .Cast<IMount>()
                                       .ToList();
        }

        protected virtual bool IsSpecialMount(IMount mount)
        {
            return false;
        }

        public virtual IMount GetMount(string path)
        {
            try
            {
                var mounts = GetAllMounts();

                return mounts.Where(drive => drive.RootDirectory.PathEquals(path) ||
                                             drive.RootDirectory.IsParentPath(path))
                          .MaxBy(drive => drive.RootDirectory.Length);
            }
            catch (Exception ex)
            {
                Logger.Debug(ex, $"Failed to get mount for path {path}");
                return null;
            }
        }

        protected List<IDriveInfo> GetDriveInfoMounts()
        {
            return _fileSystem.DriveInfo.GetDrives()
                .Where(d => d.IsReady)
                .ToList();
        }

        public List<IDirectoryInfo> GetDirectoryInfos(string path)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);

            var di = _fileSystem.DirectoryInfo.FromDirectoryName(path);

            return di.GetDirectories().ToList();
        }

        public IDirectoryInfo GetDirectoryInfo(string path)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);
            return _fileSystem.DirectoryInfo.FromDirectoryName(path);
        }

        public List<IFileInfo> GetFileInfos(string path, bool recursive = false)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);

            var di = _fileSystem.DirectoryInfo.FromDirectoryName(path);

            return di.EnumerateFiles("*", new EnumerationOptions
            {
                RecurseSubdirectories = recursive,
                IgnoreInaccessible = true
            }).ToList();
        }

        public IFileInfo GetFileInfo(string path)
        {
            Ensure.That(path, () => path).IsValidPath(PathValidationType.CurrentOs);
            return _fileSystem.FileInfo.FromFileName(path);
        }

        public void RemoveEmptySubfolders(string path)
        {
            // Depth first search for empty subdirectories
            foreach (var subdir in _fileSystem.Directory.EnumerateDirectories(path))
            {
                // A directory link is neither entered nor removed: its target can be anywhere, the library included
                if (IsDirectoryLink(subdir))
                {
                    continue;
                }

                RemoveEmptySubfolders(subdir);

                if (_fileSystem.Directory.EnumerateFileSystemEntries(subdir).Empty())
                {
                    try
                    {
                        _fileSystem.Directory.Delete(subdir, false);
                    }
                    catch (Exception ex)
                    {
                        Logger.Warn(ex, "Failed to remove empty directory {0}", subdir);
                    }
                }
            }
        }

        public void SaveStream(Stream stream, string path)
        {
            using (var fileStream = OpenWriteStream(path))
            {
                stream.CopyTo(fileStream);
            }
        }

        public virtual bool IsValidFolderPermissionMask(string mask)
        {
            throw new NotSupportedException();
        }
    }
}
