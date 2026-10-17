using System.Collections.Generic;
using System.IO;
using System.Linq;
using NzbDrone.Common;
using NzbDrone.Core.History;
using NzbDrone.Core.Parser.Model;

namespace NzbDrone.Core.MediaFiles.BookImport
{
    public static class ImportResultExtensions
    {
        // Audio files an import pass neither imported nor deliberately turned down. A file counts as turned down
        // only when every rejection on it is a DeliberateRejection (not an upgrade, already in the library or
        // imported, tagged for another book, a macOS "._" resource file) and there is evidence about this very
        // file: a history row saying it was imported from this download, or a book file of the same name and
        // size. Several of those checks judge the whole book, so on a retry a part that never imported carries
        // "already imported" because its sibling did; without the evidence it is still left behind. So is a file
        // approved but not imported (a second file claiming the same part, a destination that exists, an error
        // while moving it), a parse failure, an error, a match that wasn't close enough, a temporary rejection,
        // or a rejection nobody classified. A download with files like this must not be called imported:
        // removing it deletes them.
        public static List<string> AudioFilesLeftBehind(this IEnumerable<ImportResult> importResults, ISet<string> importedFromDownload)
        {
            return importResults
                .Where(r => IsAudio(r.ImportDecision.Item?.Path))
                .GroupBy(r => r.ImportDecision.Item.Path, PathEqualityComparer.Instance)
                .Where(g => g.All(r => r.Result != ImportResultType.Imported) && g.Any(r => IsLeftBehind(r, importedFromDownload)))
                .Select(g => g.Key)
                .ToList();
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

        private static bool HasBeenDealtWith(LocalBook file, ISet<string> importedFromDownload)
        {
            if (importedFromDownload != null && importedFromDownload.Contains(file.Path))
            {
                return true;
            }

            var bookFiles = file.Book?.BookFiles?.Value;

            return bookFiles != null &&
                   bookFiles.Any(f => f != null &&
                                      f.Size == file.Size &&
                                      string.Equals(Path.GetFileName(f.Path), Path.GetFileName(file.Path), System.StringComparison.OrdinalIgnoreCase));
        }
    }
}
