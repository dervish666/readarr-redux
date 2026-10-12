using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using NLog;
using NzbDrone.Common.Disk;
using NzbDrone.Common.Extensions;
using NzbDrone.Core.Books.Calibre;
using NzbDrone.Core.MediaFiles.BookImport;
using NzbDrone.Core.Parser.Model;
using NzbDrone.Core.RootFolders;

namespace NzbDrone.Core.MediaFiles
{
    public interface IUpgradeMediaFiles
    {
        BookFileMoveResult UpgradeBookFile(BookFile bookFile, LocalBook localBook, bool copyOnly = false, ICollection<string> importedPaths = null);
        void RemoveSetAsideFiles(IEnumerable<SetAsideBookFile> files);
        List<SetAsideBookFile> RestoreSetAsideFiles(IEnumerable<SetAsideBookFile> files);
    }

    public class UpgradeMediaFileService : IUpgradeMediaFiles
    {
        // A hidden folder, so disk scans skip the files waiting in it
        public const string SetAsideFolderName = ".readarr-upgrade";
        private const string SetAsideFolderFormat = "{0:yyyyMMdd-HHmmss}-{1:N}";

        private readonly IRecycleBinProvider _recycleBinProvider;
        private readonly IMediaFileService _mediaFileService;
        private readonly IMetadataTagService _metadataTagService;
        private readonly IMoveBookFiles _bookFileMover;
        private readonly IDiskProvider _diskProvider;
        private readonly IRootFolderService _rootFolderService;
        private readonly ICalibreProxy _calibre;
        private readonly Logger _logger;

        public UpgradeMediaFileService(IRecycleBinProvider recycleBinProvider,
                                       IMediaFileService mediaFileService,
                                       IMetadataTagService metadataTagService,
                                       IMoveBookFiles bookFileMover,
                                       IDiskProvider diskProvider,
                                       IRootFolderService rootFolderService,
                                       ICalibreProxy calibre,
                                       Logger logger)
        {
            _recycleBinProvider = recycleBinProvider;
            _mediaFileService = mediaFileService;
            _metadataTagService = metadataTagService;
            _bookFileMover = bookFileMover;
            _diskProvider = diskProvider;
            _rootFolderService = rootFolderService;
            _calibre = calibre;
            _logger = logger;
        }

        public BookFileMoveResult UpgradeBookFile(BookFile bookFile, LocalBook localBook, bool copyOnly = false, ICollection<string> importedPaths = null)
        {
            var moveFileResult = new BookFileMoveResult();

            // Read the book's files from the database, not the cached localBook.Book.BookFiles. Every part of a
            // multi-part import shares that Book, so the cached list still holds files an earlier part removed,
            // and their paths may now hold the new parts. New files are only added after every part has moved.
            var existingFiles = _mediaFileService.GetFilesByBook(localBook.Book.Id);

            var rootFolderPath = _diskProvider.GetParentFolder(localBook.Author.Path);
            var rootFolder = _rootFolderService.GetBestRootFolder(rootFolderPath);
            var isCalibre = rootFolder.IsCalibreLibrary && rootFolder.CalibreSettings != null;

            var settings = rootFolder.CalibreSettings;

            // If there are existing book files and the root folder is missing, throw, so the old file isn't left behind during the import process.
            if (existingFiles.Any() && !_diskProvider.FolderExists(rootFolderPath))
            {
                throw new RootFolderNotFoundException($"Root folder '{rootFolderPath}' was not found.");
            }

            // Old files are set aside, not deleted, until the new file is in place. If the move fails they go back
            // where they were, and the caller recycles them only once every part of the release has imported.
            // The folder name is unique to this upgrade, so concurrent imports never share one.
            var setAside = new List<SetAsideBookFile>();
            var setAsideFolder = string.Format(SetAsideFolderFormat, DateTime.UtcNow, Guid.NewGuid());
            var sourcePath = bookFile.Path;

            try
            {
                foreach (var file in existingFiles)
                {
                    var bookFilePath = file.Path;
                    var subfolder = rootFolderPath.GetRelativePath(_diskProvider.GetParentFolder(bookFilePath));

                    bookFile.CalibreId = file.CalibreId;

                    // A stale row can point at a path another book's new file has just been moved to
                    if (importedPaths != null && importedPaths.Contains(bookFilePath))
                    {
                        _logger.Warn("{0} was just imported for another book, so it won't be removed as an old file of {1}", bookFilePath, localBook.Book);
                    }
                    else if (_diskProvider.FileExists(bookFilePath))
                    {
                        _logger.Debug("Removing existing book file: {0} CalibreId: {1}", file, file.CalibreId);

                        if (!isCalibre)
                        {
                            setAside.Add(SetAside(bookFilePath, subfolder, setAsideFolder));
                        }
                        else
                        {
                            var existing = _calibre.GetBook(file.CalibreId, settings);
                            var existingFormats = existing.Formats.Keys;
                            _logger.Debug($"Removing existing formats {existingFormats.ConcatToString()} from calibre");
                            _calibre.RemoveFormats(file.CalibreId, existingFormats, settings);
                        }
                    }
                }

                if (!isCalibre)
                {
                    // Claim the destination before the transfer starts: it can move the file and still throw, and the
                    // path stays claimed either way so no other book's upgrade takes what's there for an old file.
                    // Done after the set-aside above, which must still clear this book's own old file off that path.
                    var destination = _bookFileMover.GetBookFilePath(bookFile, localBook);

                    if (destination.IsNotNullOrWhiteSpace())
                    {
                        importedPaths?.Add(destination);
                    }

                    if (copyOnly)
                    {
                        moveFileResult.BookFile = _bookFileMover.CopyBookFile(bookFile, localBook);
                    }
                    else
                    {
                        moveFileResult.BookFile = _bookFileMover.MoveBookFile(bookFile, localBook);
                    }
                }
                else
                {
                    moveFileResult.BookFile = _calibre.AddAndConvert(bookFile, settings);

                    if (!copyOnly)
                    {
                        _diskProvider.DeleteFile(sourcePath);
                    }
                }

                importedPaths?.Add(bookFile.Path);
            }
            catch
            {
                // The mover sets bookFile.Path as soon as the file lands, before the date and permission steps that
                // can still throw. Take the new file back off the old path before putting the old files back.
                if (!isCalibre && !bookFile.Path.PathEquals(sourcePath))
                {
                    UndoTransfer(bookFile, sourcePath, copyOnly, importedPaths);
                }

                RestoreSetAsideFiles(setAside);
                throw;
            }

            foreach (var file in existingFiles)
            {
                moveFileResult.OldFiles.Add(file);
                _mediaFileService.Delete(file, DeleteMediaFileReason.Upgrade);
            }

            moveFileResult.SetAsideFiles = setAside;

            if (!isCalibre)
            {
                try
                {
                    _metadataTagService.WriteTags(bookFile, true);
                }
                catch (Exception e)
                {
                    // The file has moved and the old rows are gone, so a failed retag must not fail the import
                    _logger.Warn(e, "Couldn't write tags to {0}, keeping its existing tags", bookFile.Path);
                }
            }

            return moveFileResult;
        }

        public void RemoveSetAsideFiles(IEnumerable<SetAsideBookFile> files)
        {
            var folders = new HashSet<string>();

            foreach (var file in files)
            {
                try
                {
                    _recycleBinProvider.DeleteFile(file.Path, file.RecycleBinSubfolder);
                }
                catch (Exception e)
                {
                    _logger.Warn(e, "Unable to remove replaced book file {0}, it is still at {1}", file.OriginalPath, file.Path);
                }

                folders.Add(_diskProvider.GetParentFolder(file.Path));
            }

            RemoveEmptySetAsideFolders(folders);
        }

        private SetAsideBookFile SetAside(string path, string subfolder, string setAsideFolder)
        {
            var folder = Path.Combine(_diskProvider.GetParentFolder(path), SetAsideFolderName, setAsideFolder);
            var destination = Path.Combine(folder, Path.GetFileName(path));

            _logger.Debug("Setting aside existing book file {0} until its replacement is in place", path);

            _diskProvider.CreateFolder(folder);
            _diskProvider.MoveFile(path, destination);

            return new SetAsideBookFile
            {
                OriginalPath = path,
                Path = destination,
                RecycleBinSubfolder = subfolder
            };
        }

        private void UndoTransfer(BookFile bookFile, string sourcePath, bool copyOnly, ICollection<string> importedPaths)
        {
            var destination = bookFile.Path;

            try
            {
                if (copyOnly)
                {
                    // A copy or hardlink: the download still has the original
                    _diskProvider.DeleteFile(destination);
                }
                else
                {
                    _diskProvider.MoveFile(destination, sourcePath);
                }

                bookFile.Path = sourcePath;
            }
            catch (Exception e)
            {
                // The new file stays where it landed, so no other book's upgrade may take it for an old file
                _logger.Error(e, "Unable to undo the import of {0}, the new file is still at {1}", sourcePath, destination);
                importedPaths?.Add(destination);
            }
        }

        public List<SetAsideBookFile> RestoreSetAsideFiles(IEnumerable<SetAsideBookFile> files)
        {
            var kept = new List<SetAsideBookFile>();
            var folders = new HashSet<string>();

            foreach (var file in files)
            {
                if (PutBack(file))
                {
                    folders.Add(_diskProvider.GetParentFolder(file.Path));
                }
                else
                {
                    kept.Add(file);
                }
            }

            RemoveEmptySetAsideFolders(folders);

            return kept;
        }

        // A new file may sit on the old path, or land there at any moment, and must never be replaced. A check and
        // a rename can't promise that (rename replaces whatever is there), so the backup is hardlinked into place,
        // or copied with an exclusive create when it can't be linked. Both fail if the path is taken. Only then is
        // the backup removed.
        private bool PutBack(SetAsideBookFile file)
        {
            try
            {
                if (!_diskProvider.TryCreateHardLink(file.Path, file.OriginalPath))
                {
                    if (_diskProvider.FileExists(file.OriginalPath))
                    {
                        _logger.Warn("{0} already holds another file, so the old one stays at {1}", file.OriginalPath, file.Path);
                        return false;
                    }

                    _diskProvider.CopyFile(file.Path, file.OriginalPath, false);
                }
            }
            catch (Exception e)
            {
                _logger.Warn(e, "Couldn't put the old file back at {0} without replacing what's there, so it stays at {1}", file.OriginalPath, file.Path);
                return false;
            }

            try
            {
                _diskProvider.DeleteFile(file.Path);
            }
            catch (Exception e)
            {
                _logger.Warn(e, "Put the old file back at {0}, but couldn't remove its backup at {1}", file.OriginalPath, file.Path);
            }

            return true;
        }

        private void RemoveEmptySetAsideFolders(IEnumerable<string> folders)
        {
            foreach (var folder in folders)
            {
                // The per-upgrade folder, then the shared set-aside folder above it. Either may still hold files (one
                // that couldn't be recycled, or another import's folder), and then it stays.
                foreach (var path in new[] { folder, _diskProvider.GetParentFolder(folder) })
                {
                    try
                    {
                        _diskProvider.DeleteEmptyFolder(path);
                    }
                    catch (Exception e)
                    {
                        _logger.Debug(e, "Left set-aside folder {0} in place", path);
                    }
                }
            }
        }
    }
}
