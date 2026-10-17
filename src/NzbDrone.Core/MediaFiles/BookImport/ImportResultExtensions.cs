using System.Collections.Generic;
using System.IO;
using System.Linq;
using NzbDrone.Common;

namespace NzbDrone.Core.MediaFiles.BookImport
{
    public static class ImportResultExtensions
    {
        // Audio files an import pass neither imported nor deliberately turned down. A file counts as
        // turned down only when every rejection on it is a DeliberateRejection (not an upgrade, already
        // in the library or imported, tagged for another book, a macOS "._" resource file). Anything else
        // leaves it behind: approved but not imported (a second file claiming the same part, a destination
        // that exists, an error while moving it), a parse failure, an error, a match that wasn't close
        // enough, a temporary rejection, or a rejection nobody classified. A download with files like this
        // must not be called imported: removing it deletes them.
        public static List<string> AudioFilesLeftBehind(this IEnumerable<ImportResult> importResults)
        {
            return importResults
                .Where(r => IsAudio(r.ImportDecision.Item?.Path))
                .GroupBy(r => r.ImportDecision.Item.Path, PathEqualityComparer.Instance)
                .Where(g => g.All(r => r.Result != ImportResultType.Imported) && g.Any(IsLeftBehind))
                .Select(g => g.Key)
                .ToList();
        }

        public static bool IsAudio(string path)
        {
            return path != null && MediaFileExtensions.AudioExtensions.Contains(Path.GetExtension(path));
        }

        private static bool IsLeftBehind(ImportResult result)
        {
            return result.Result == ImportResultType.Skipped ||
                   (result.Result == ImportResultType.Rejected && result.ImportDecision.Rejections.Any(x => x is not DeliberateRejection));
        }
    }
}
