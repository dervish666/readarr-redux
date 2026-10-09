using System.Collections.Generic;
using System.IO;
using System.Linq;
using NLog;
using NzbDrone.Common;
using NzbDrone.Core.DecisionEngine;
using NzbDrone.Core.MediaFiles.BookImport.Specifications;

namespace NzbDrone.Core.MediaFiles.BookImport
{
    public interface IPartsLeftBehindService
    {
        List<string> PartsLeftBehind(IEnumerable<ImportResult> importResults);
    }

    // A download whose book is short of parts in the library still holds the parts that didn't import, and calling
    // it imported lets the download client's remove-completed delete them.
    public class PartsLeftBehindService : IPartsLeftBehindService
    {
        private readonly IMediaFileService _mediaFileService;
        private readonly Logger _logger;

        public PartsLeftBehindService(IMediaFileService mediaFileService, Logger logger)
        {
            _mediaFileService = mediaFileService;
            _logger = logger;
        }

        // Paths of audio files matched to a book that didn't import for a reason that means the part is missing,
        // for each book whose library files now number fewer than the parts the import expected
        public List<string> PartsLeftBehind(IEnumerable<ImportResult> importResults)
        {
            var leftBehind = new List<string>();

            var books = importResults.Where(r => r.ImportDecision.Item?.Book != null && IsAudio(r.ImportDecision.Item.Path))
                .GroupBy(r => r.ImportDecision.Item.Book.ForeignBookId);

            foreach (var book in books)
            {
                var missing = book.Where(PartNotImported)
                    .Select(r => r.ImportDecision.Item.Path)
                    .Distinct(PathEqualityComparer.Instance)
                    .ToList();

                if (!missing.Any())
                {
                    continue;
                }

                // A rescan after a partial move imports nothing and rejects the rest as already imported, so judge
                // by what the library holds rather than by what this run imported
                var expected = book.Max(r => r.ImportDecision.Item.PartCount);

                if (expected == 0)
                {
                    expected = book.Where(r => r.Result == ImportResultType.Imported || PartNotImported(r))
                        .Select(r => r.ImportDecision.Item.Path)
                        .Distinct(PathEqualityComparer.Instance)
                        .Count();
                }

                var bookId = book.Select(r => r.ImportDecision.Item.Book.Id).FirstOrDefault(id => id != 0);
                var inLibrary = bookId == 0 ? 0 : (_mediaFileService.GetFilesByBook(bookId) ?? new List<BookFile>()).Count(f => IsAudio(f.Path));

                if (inLibrary >= expected)
                {
                    _logger.Debug("{0} has {1} of {2} parts in the library, not holding the download for {3}", book.First().ImportDecision.Item.Book, inLibrary, expected, missing.Count);
                    continue;
                }

                leftBehind.AddRange(missing);
            }

            return leftBehind;
        }

        // Only reasons that mean this part didn't make it count. A file that isn't an upgrade, is a different
        // edition or a preview was never going to be imported, and the book is complete without it.
        private static bool PartNotImported(ImportResult result)
        {
            // Approved but not imported: a second file for the same part, or an error while moving it
            if (result.Result == ImportResultType.Skipped)
            {
                return true;
            }

            if (result.Result != ImportResultType.Rejected)
            {
                return false;
            }

            return result.ImportDecision.Rejections.Any(r =>
                r.Type == RejectionType.Temporary ||
                r.Reason == ImportApprovedBooks.ConflictingPartsReason ||
                (r.Reason?.StartsWith(AlreadyImportedSpecification.AlreadyImportedReason) ?? false));
        }

        private static bool IsAudio(string path)
        {
            return path != null && MediaFileExtensions.AudioExtensions.Contains(Path.GetExtension(path));
        }
    }
}
