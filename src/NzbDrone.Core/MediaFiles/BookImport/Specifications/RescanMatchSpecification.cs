using System.Linq;
using NLog;
using NzbDrone.Common.Extensions;
using NzbDrone.Core.DecisionEngine;
using NzbDrone.Core.Download;
using NzbDrone.Core.MediaFiles.BookImport.Identification;
using NzbDrone.Core.Parser.Model;

namespace NzbDrone.Core.MediaFiles.BookImport.Specifications
{
    // A rescan has nothing but the files' tags to go on, and the book it picks gets written into those tags. So it
    // takes a book only on an identifier the edition shares, or on a title that names that book and no other. Left
    // alone, an untracked file stays unmapped and a tracked one keeps its book.
    public class RescanMatchSpecification : IImportDecisionEngineSpecification<LocalEdition>
    {
        // The bar CloseBookMatchSpecification sets for a whole match, here for the title alone. In a whole match a
        // matching author at least halves the title's weight, so "Foundation and Earth" passed for Foundation and Empire.
        private const double TitleThreshold = 0.2;

        private readonly Logger _logger;

        public RescanMatchSpecification(Logger logger)
        {
            _logger = logger;
        }

        public Decision IsSatisfiedBy(LocalEdition item, DownloadClientItem downloadClientItem)
        {
            if (item.NewDownload || item.Edition == null)
            {
                return Decision.Accept();
            }

            var book = item.Edition.Book.Value;

            // The files already on the matched book joined the release when it matched. They don't vouch for it.
            var files = item.LocalBooks.Where(x => !x.AdditionalFile).ToList();

            if (DistanceCalculator.NamesDifferentlyNumberedBooks(files))
            {
                _logger.Debug("Not mapping {0} in a rescan, its files name books with different numbers", item);
                return Decision.Reject("Files name books with different numbers");
            }

            var titles = item.TitleMatches
                .GroupBy(x => x.ForeignBookId)
                .Select(g => new TitleMatch
                {
                    ForeignBookId = g.Key,
                    Title = g.First().Title,
                    Distance = g.Min(x => x.Distance),
                    LooseDistance = g.Min(x => x.LooseDistance),
                    SharesIdentifier = g.Any(x => x.SharesIdentifier)
                })
                .ToList();

            // An ISBN, ASIN or Goodreads id that is another book's outweighs any title
            var named = titles.Where(x => x.ForeignBookId != book.ForeignBookId && x.SharesIdentifier).ToList();

            if (named.Any())
            {
                _logger.Debug("Not mapping {0} to {1} in a rescan, its tags carry an identifier of {2}", item, book, named.Select(x => x.Title).ConcatToString(", "));
                return Decision.Reject($"Tags carry an identifier of {named.Select(x => x.Title).ConcatToString(", ")}, not {book}");
            }

            if (DistanceCalculator.MatchesIdentifier(files, item.Edition))
            {
                _logger.Debug("Accepting {0} for {1}, its tags carry the edition's identifier", item, book);
                return Decision.Accept();
            }

            var match = titles.SingleOrDefault(x => x.ForeignBookId == book.ForeignBookId);

            if (match == null || match.Distance > TitleThreshold)
            {
                var distance = match?.Distance ?? 1.0;

                _logger.Debug("Not mapping {0} to {1} in a rescan, its title is {2:P1} like the book's", item, book, 1 - distance);
                return Decision.Reject($"Title matches {book} only {1 - distance:P1}, a rescan needs {1 - TitleThreshold:P0}");
            }

            // Another book named as closely, or more closely by the part of its title before a colon, makes this a
            // guess: two works both called "Second Foundation", or "The Chronicles of Narnia" against each of its books
            var rivals = titles
                .Where(x => x.ForeignBookId != match.ForeignBookId)
                .Where(x => x.Distance <= match.Distance || x.LooseDistance < match.Distance)
                .ToList();

            if (rivals.Any())
            {
                _logger.Debug("Not mapping {0} to {1} in a rescan, its title fits {2} as well", item, book, rivals.Select(x => x.Title).ConcatToString(", "));
                return Decision.Reject($"Title fits other books as well as {book}: {rivals.Select(x => x.Title).ConcatToString(", ")}");
            }

            return Decision.Accept();
        }
    }
}
