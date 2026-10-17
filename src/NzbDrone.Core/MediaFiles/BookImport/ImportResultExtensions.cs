using System.Collections.Generic;
using System.IO;
using System.Linq;
using NzbDrone.Common;
using NzbDrone.Common.Disk;
using NzbDrone.Core.History;
using NzbDrone.Core.Parser.Model;

namespace NzbDrone.Core.MediaFiles.BookImport
{
    public static class ImportResultExtensions
    {
        // Audio files an import pass neither imported nor deliberately turned down. A file counts as turned down
        // only when every rejection on it is a DeliberateRejection (not an upgrade, already in the library or
        // imported, tagged for another book, a macOS "._" resource file) and history shows this very file was
        // imported from this download. Several of those checks judge the whole book, so on a retry a part that never imported carries
        // "already imported" because its sibling did; without the evidence it is still left behind. So is a file
        // approved but not imported (a second file claiming the same part, a destination that exists, an error
        // while moving it), a parse failure, an error, a match that wasn't close enough, a temporary rejection,
        // or a rejection nobody classified. A download with files like this must not be called imported:
        // removing it deletes them.
        //
        // The import only sees the files its scan lists, and the scan skips extras, @eaDir, Plex Versions,
        // dot-folders and the like. So every audio file on disk counts as well: one with no Imported result
        // from this pass and no history row from this download is left behind, wherever it sits.
        public static List<string> AudioFilesLeftBehind(this IEnumerable<ImportResult> importResults, ISet<string> importedFromDownload, IEnumerable<string> audioFilesOnDisk)
        {
            var results = importResults.ToList();

            // Known limit: paths compare case-insensitively on Windows, even in a folder set case-sensitive there
            var leftBehind = results
                .Where(r => IsAudio(r.ImportDecision.Item?.Path))
                .GroupBy(r => r.ImportDecision.Item.Path, PathEqualityComparer.Instance)
                .Where(g => g.All(r => r.Result != ImportResultType.Imported) && g.Any(r => IsLeftBehind(r, importedFromDownload)))
                .Select(g => g.Key)
                .ToList();

            var accounted = results
                .Where(r => r.Result == ImportResultType.Imported && r.ImportDecision.Item?.Path != null)
                .Select(r => r.ImportDecision.Item.Path)
                .Concat(importedFromDownload ?? Enumerable.Empty<string>())
                .Concat(leftBehind)
                .ToHashSet(PathEqualityComparer.Instance);

            leftBehind.AddRange(audioFilesOnDisk.Where(p => !accounted.Contains(p)).Distinct(PathEqualityComparer.Instance));

            return leftBehind;
        }

        // Every audio file in a download as it sits on disk, in any folder, leaving out only macOS "._" files.
        // Throws when it can't be listed, and the caller must then not call the download imported or delete it.
        // A missing path counts as empty only when this same import removed it: it deleted the folder after
        // checking, or moved that exact single file. Anything else (a share that dropped, a mapping gone stale)
        // throws, because the files may still be in the client and Remove Completed would delete them.
        public static List<string> AudioFilesOnDisk(this IDiskProvider diskProvider, string outputPath, IEnumerable<ImportResult> importResults)
        {
            IEnumerable<string> files;

            if (diskProvider.FileExists(outputPath))
            {
                files = new[] { outputPath };
            }
            else if (diskProvider.FolderExists(outputPath))
            {
                files = diskProvider.GetAllFilesOrThrow(outputPath);
            }
            else if (importResults.Any(r => RemovedBy(r, outputPath)))
            {
                return new List<string>();
            }
            else
            {
                throw new DirectoryNotFoundException($"{outputPath} is missing and this import didn't remove it");
            }

            return files.Where(p => IsAudio(p) && !Path.GetFileName(p).StartsWith("._")).ToList();
        }

        private static bool RemovedBy(ImportResult result, string outputPath)
        {
            var comparer = PathEqualityComparer.Instance;

            return (result.RemovedFolder != null && comparer.Equals(result.RemovedFolder, outputPath)) ||
                   (result.Result == ImportResultType.Imported && result.SourceMoved && comparer.Equals(result.ImportDecision.Item?.Path ?? string.Empty, outputPath));
        }

        // Source paths of the files history says were imported from this download
        public static HashSet<string> ImportedSourcePaths(this IEnumerable<EntityHistory> downloadHistory)
        {
            return downloadHistory
                .Where(h => h.EventType == EntityHistoryEventType.BookFileImported && h.Data != null)
                .Select(h => h.Data.GetValueOrDefault("droppedPath") ?? h.Data.GetValueOrDefault("DroppedPath"))
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .ToHashSet(PathEqualityComparer.Instance);
        }

        public static bool IsAudio(string path)
        {
            return path != null && MediaFileExtensions.AudioExtensions.Contains(Path.GetExtension(path));
        }

        private static bool IsLeftBehind(ImportResult result, ISet<string> importedFromDownload)
        {
            if (result.Result == ImportResultType.Skipped)
            {
                return true;
            }

            if (result.Result != ImportResultType.Rejected)
            {
                return false;
            }

            return result.ImportDecision.Rejections.Any(x => x is not DeliberateRejection) ||
                   !HasBeenDealtWith(result.ImportDecision.Item, importedFromDownload);
        }

        // The only evidence is a history row from this download naming this file as its source. Matching on
        // anything looser (a library file of the same name and size) clears CD2/01.mp3 because CD1/01.mp3 is in.
        // A miss keeps the download: it stays Import Failed and nothing is deleted.
        private static bool HasBeenDealtWith(LocalBook file, ISet<string> importedFromDownload)
        {
            return importedFromDownload != null && importedFromDownload.Contains(file.Path);
        }
    }
}
