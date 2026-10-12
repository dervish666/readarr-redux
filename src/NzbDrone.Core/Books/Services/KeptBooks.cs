using System;
using System.Collections.Generic;
using System.Threading;
using NLog;

namespace NzbDrone.Core.Books
{
    // A refresh keeps a book as it is when the metadata source can't return it: a work Goodreads merged away, on a
    // book with files or added by hand, or a work the source answers with a server error. The same books turn up on
    // every run, so inside a run each logs at Debug and the run ends with one Warn listing them. Outside a run each
    // logs its own Warn.
    public static class KeptBooks
    {
        private static readonly AsyncLocal<Tally> Current = new AsyncLocal<Tally>();

        public static IDisposable Start(Logger logger)
        {
            var scope = new Scope(Current.Value, logger);
            Current.Value = new Tally();
            return scope;
        }

        public static void NotFound(Book book, Logger logger)
        {
            const string message = "Book {0} is no longer in the metadata. Keeping it, as it has files or was added by hand";

            var tally = Current.Value;

            if (tally == null)
            {
                logger.Warn(message, book);
                return;
            }

            logger.Debug(message, book);
            tally.NotFound.Add(book.ToString());
        }

        public static void Failed(Book book, Exception e, Logger logger)
        {
            var tally = Current.Value;

            if (tally == null)
            {
                logger.Warn("Couldn't refresh info for book {0}, keeping it as it is. {1}", book, e.Message);
                return;
            }

            logger.Debug(e, "Couldn't refresh info for book {0}, keeping it as it is", book);
            tally.Failed.Add(book.ToString());
        }

        private sealed class Tally
        {
            public List<string> NotFound { get; } = new List<string>();
            public List<string> Failed { get; } = new List<string>();
        }

        private sealed class Scope : IDisposable
        {
            private readonly Tally _previous;
            private readonly Logger _logger;

            public Scope(Tally previous, Logger logger)
            {
                _previous = previous;
                _logger = logger;
            }

            public void Dispose()
            {
                var tally = Current.Value;
                Current.Value = _previous;

                if (tally == null || tally.NotFound.Count + tally.Failed.Count == 0)
                {
                    return;
                }

                var parts = new List<string>();

                if (tally.NotFound.Count > 0)
                {
                    parts.Add($"No longer in the metadata, kept for their files or as added by hand ({tally.NotFound.Count}): {string.Join(", ", tally.NotFound)}.");
                }

                if (tally.Failed.Count > 0)
                {
                    parts.Add($"The metadata source failed on their works ({tally.Failed.Count}): {string.Join(", ", tally.Failed)}.");
                }

                _logger.Warn("Kept {0} books as they are because the metadata source couldn't return them. {1}", tally.NotFound.Count + tally.Failed.Count, string.Join(" ", parts));
            }
        }
    }
}
