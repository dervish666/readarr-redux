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
                _metadataTagService.WriteTags(bookFile, true);
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
                // A new file may already sit on the old path. Never move over it, keep the old one set aside instead.
                if (_diskProvider.FileExists(file.OriginalPath))
                {
                    _logger.Debug("{0} now holds a new file, leaving the old one at {1}", file.OriginalPath, file.Path);
                    kept.Add(file);
                    continue;
                }

                try
                {
                    _diskProvider.MoveFile(file.Path, file.OriginalPath);
                    folders.Add(_diskProvider.GetParentFolder(file.Path));
                }
                catch (Exception e)
                {
                    _logger.Error(e, "Unable to put existing book file back at {0}, it is still at {1}", file.OriginalPath, file.Path);
                    kept.Add(file);
                }
            }

            RemoveEmptySetAsideFolders(folders);

            return kept;
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
