using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using NLog;
using NzbDrone.Common.Extensions;
using NzbDrone.Common.Instrumentation;
using NzbDrone.Core.Books;
using NzbDrone.Core.Books.Calibre;
using NzbDrone.Core.Parser;
using NzbDrone.Core.Parser.Model;

namespace NzbDrone.Core.MediaFiles.BookImport.Identification
{
    public static class DistanceCalculator
    {
        private static readonly Logger Logger = NzbDroneLogger.GetLogger(typeof(DistanceCalculator));

        public static readonly List<string> VariousAuthorIds = new List<string> { "89ad4ac3-39f7-470e-963a-56509c546377" };

        private static readonly RegexReplace StripSeriesRegex = new RegexReplace(@"\([^\)].+?\)$", string.Empty, RegexOptions.Compiled);

        private static readonly RegexReplace CleanTitleCruft = new RegexReplace(@"\((?:unabridged)\)", string.Empty, RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex NumbersRegex = new Regex(@"\d+", RegexOptions.Compiled);

        private static readonly Regex DiscMarkerRegex = new Regex(@"\b(?:dis[ck]|cd|part|pt)\.?\s*\d+", RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly List<string> EbookFormats = new List<string> { "Kindle Edition", "Nook", "ebook" };

        private static readonly List<string> AudiobookFormats = new List<string> { "Audiobook", "Audio CD", "Audio Cassette", "Audible Audio", "CD-ROM", "MP3 CD" };

        public static Distance BookDistance(List<LocalBook> localTracks, Edition edition)
        {
            var dist = new Distance();

            // the most common list of authors reported by a file
            var fileAuthors = localTracks.Select(x => x.FileTrackInfo.Authors.Where(a => a.IsNotNullOrWhiteSpace()).ToList())
                .GroupBy(x => x.ConcatToString())
                .OrderByDescending(x => x.Count())
                .First()
                .First();

            var authors = GetAuthorVariants(fileAuthors);

            dist.AddString("author", authors, edition.Book.Value.AuthorMetadata.Value.Name);
            Logger.Trace("author: '{0}' vs '{1}'; {2}", authors.ConcatToString("' or '"), edition.Book.Value.AuthorMetadata.Value.Name, dist.NormalizedDistance());

            var title = localTracks.MostCommon(x => x.FileTrackInfo.BookTitle) ?? "";
            var titleOptions = TitleOptions(edition);
            var fileTitles = new[] { title, CleanTitleCruft.Replace(title) }.Distinct().ToList();

            dist.AddString("book", fileTitles, titleOptions);
            Logger.Trace("book: '{0}' vs '{1}'; {2}", fileTitles.ConcatToString("' or '"), titleOptions.ConcatToString("' or '"), dist.NormalizedDistance());

            var isbn = localTracks.MostCommon(x => x.FileTrackInfo.Isbn);
            if (isbn.IsNotNullOrWhiteSpace() && edition.Isbn13.IsNotNullOrWhiteSpace())
            {
                // An ISBN-10 in the tags is the same book as the edition's ISBN-13
                dist.AddBool("isbn", (Isbn13(isbn) ?? isbn) != (Isbn13(edition.Isbn13) ?? edition.Isbn13));
                Logger.Trace("isbn: '{0}' vs '{1}'; {2}", isbn, edition.Isbn13, dist.NormalizedDistance());
            }
            else if (isbn.IsNullOrWhiteSpace() != edition.Isbn13.IsNullOrWhiteSpace())
            {
                dist.AddBool("isbn_missing", true);
                Logger.Trace("isbn: '{0}' vs '{1}'; {2}", isbn, edition.Isbn13, dist.NormalizedDistance());
            }

            var asin = localTracks.MostCommon(x => x.FileTrackInfo.Asin);
            if (asin.IsNotNullOrWhiteSpace() && edition.Asin.IsNotNullOrWhiteSpace())
            {
                dist.AddBool("asin", asin != edition.Asin);
                Logger.Trace("asin: '{0}' vs '{1}'; {2}", asin, edition.Asin, dist.NormalizedDistance());
            }
            else if (asin.IsNullOrWhiteSpace() != edition.Asin.IsNullOrWhiteSpace())
            {
                dist.AddBool("asin_missing", true);
                Logger.Trace("asin: '{0}' vs '{1}'; {2}", asin, edition.Asin, dist.NormalizedDistance());
            }

            // Year
            var localYear = localTracks.MostCommon(x => x.FileTrackInfo.Year);
            if (localYear > 0 && edition.ReleaseDate.HasValue)
            {
                var bookYear = edition.ReleaseDate?.Year ?? 0;
                if (localYear == bookYear)
                {
                    dist.Add("year", 0.0);
                }
                else
                {
                    var remoteYear = bookYear;
                    var diff = Math.Abs(localYear - remoteYear);
                    var diff_max = Math.Abs(DateTime.Now.Year - remoteYear);
                    dist.AddRatio("year", diff, diff_max);
                }

                Logger.Trace($"year: {localYear} vs {edition.ReleaseDate?.Year}; {dist.NormalizedDistance()}");
            }

            // Language - only if set for both the local book and remote edition
            var localLanguage = localTracks.MostCommon(x => x.FileTrackInfo.Language).CanonicalizeLanguage();
            var editionLanguage = edition.Language.CanonicalizeLanguage();
            if (localLanguage.IsNotNullOrWhiteSpace() && editionLanguage.IsNotNullOrWhiteSpace())
            {
                dist.AddBool("language", localLanguage != editionLanguage);
                Logger.Trace($"language: {localLanguage} vs {editionLanguage}; {dist.NormalizedDistance()}");
            }

            // Publisher - only if set for both the local book and remote edition
            var localPublisher = localTracks.MostCommon(x => x.FileTrackInfo.Publisher);
            var editionPublisher = edition.Publisher;
            if (localPublisher.IsNotNullOrWhiteSpace() && editionPublisher.IsNotNullOrWhiteSpace())
            {
                dist.AddString("publisher", localPublisher, editionPublisher);
                Logger.Trace($"publisher: {localPublisher} vs {editionPublisher}; {dist.NormalizedDistance()}");
            }

            // try to tilt it towards the correct "type" of release
            var isAudio = MediaFileExtensions.AudioExtensions.Contains(localTracks.First().Path.GetPathExtension());

            if (edition.Format.IsNotNullOrWhiteSpace())
            {
                if (!isAudio)
                {
                    // text books should prefer ebook formats
                    dist.AddBool("ebook_format", !EbookFormats.Contains(edition.Format));

                    // text books should not match audio entries
                    dist.AddBool("wrong_format", AudiobookFormats.Contains(edition.Format));
                }
                else
                {
                    // audio books should prefer audio formats
                    dist.AddBool("audio_format", !AudiobookFormats.Contains(edition.Format));
                }
            }

            return dist;
        }

        // How closely the files' book title names this edition's book. Distance counts only the book's own titles,
        // and only where both titles carry the same numbers ("Hellraiser #5" is not "Hellraiser #6"). LooseDistance
        // also counts the part of a title before its colon: for "Everville: The Second Book of the Art" that is the
        // title, but for "The Chronicles of Narnia: The Lion, the Witch and the Wardrobe" it is the series.
        public static TitleMatch GetTitleMatch(List<LocalBook> localTracks, Edition edition)
        {
            var title = localTracks.MostCommon(x => x.FileTrackInfo.BookTitle) ?? "";
            var fileTitles = new[] { title, CleanTitleCruft.Replace(title), WithoutBrackets(title) }
                .Where(x => x.IsNotNullOrWhiteSpace())
                .Distinct()
                .ToList();

            var ownTitles = OwnTitles(edition);

            return new TitleMatch
            {
                ForeignBookId = edition.Book.Value.ForeignBookId,
                Title = edition.Book.Value.Title,
                Distance = Closest(fileTitles, ownTitles, true),
                LooseDistance = Closest(fileTitles, ownTitles.Concat(TitleOptions(edition)).Distinct().ToList(), false),
                SharesIdentifier = CompareIdentifiers(localTracks, edition).Any(x => x)
            };
        }

        // The files carry an ISBN, ASIN or Goodreads id that is this edition's, and none that contradicts it
        public static bool MatchesIdentifier(List<LocalBook> localTracks, Edition edition)
        {
            var checks = CompareIdentifiers(localTracks, edition);

            return checks.Any() && checks.All(x => x);
        }

        // "The Chronicles of Narnia (Book 5)" and "(Book 6)" are close enough to be grouped as one release, and then
        // the most common title alone would decide for all of them. Within one book a different number in the book tag
        // is a disc, or a part when each file has its own and they count from 1.
        public static bool NamesDifferentlyNumberedBooks(List<LocalBook> localTracks)
        {
            var numberings = localTracks
                .Select(x => x.FileTrackInfo?.BookTitle)
                .Where(x => x.IsNotNullOrWhiteSpace())
                .Select(x => Numbers(DiscMarkerRegex.Replace(x, string.Empty)).ToList())
                .ToList();

            var distinct = numberings.Select(x => x.ConcatToString(" ")).Distinct().Count();

            if (distinct <= 1)
            {
                return false;
            }

            if (distinct < numberings.Count)
            {
                return true;
            }

            var parts = numberings.Select(x => int.TryParse(x.LastOrDefault(), out var n) ? n : 0).OrderBy(x => x);

            return !parts.SequenceEqual(Enumerable.Range(1, numberings.Count));
        }

        // Whether each identifier both the files and the edition have agrees
        private static List<bool> CompareIdentifiers(List<LocalBook> localTracks, Edition edition)
        {
            var checks = new List<bool>();

            var isbns = Values(localTracks, x => Isbn13(x.FileTrackInfo.Isbn));
            var isbn = Isbn13(edition.Isbn13);
            if (isbns.Any() && isbn != null)
            {
                checks.Add(isbns.Count == 1 && isbns[0] == isbn);
            }

            var asins = Values(localTracks, x => x.FileTrackInfo.Asin?.Trim().ToUpperInvariant());
            var asin = edition.Asin?.Trim().ToUpperInvariant();
            if (asins.Any() && asin.IsNotNullOrWhiteSpace())
            {
                checks.Add(asins.Count == 1 && asins[0] == asin);
            }

            var goodreads = Values(localTracks, x => x.FileTrackInfo.GoodreadsId?.Trim());
            if (goodreads.Any())
            {
                checks.Add(goodreads.Count == 1 && (goodreads[0] == edition.ForeignEditionId || goodreads[0] == edition.Book.Value.ForeignBookId));
            }

            return checks;
        }

        private static List<string> TitleOptions(Edition edition)
        {
            var titleOptions = new List<string> { edition.Title };
            if (titleOptions[0].Contains("#"))
            {
                titleOptions.Add(StripSeriesRegex.Replace(titleOptions[0]));
            }

            var (maintitle, _) = edition.Title.SplitBookTitle(edition.Book.Value.AuthorMetadata.Value.Name);
            if (!titleOptions.Contains(maintitle))
            {
                titleOptions.Add(maintitle);
            }

            titleOptions.AddRange(SeriesTitles(edition));

            return titleOptions;
        }

        // The edition title, without bracketed notes, a series marker or an author prefix, or with its series. And the
        // book's title, which is what Readarr writes into a file's book tag.
        private static List<string> OwnTitles(Edition edition)
        {
            var title = edition.Title;
            var author = edition.Book.Value.AuthorMetadata.Value.Name;
            var titles = new List<string> { title, WithoutBrackets(title), edition.Book.Value.Title };

            if (title.Contains("#"))
            {
                titles.Add(StripSeriesRegex.Replace(title));
            }

            if (author.IsNotNullOrWhiteSpace() && title.StartsWith($"{author}:"))
            {
                titles.Add(title.Split(':', 2)[1].Trim());
            }

            titles.AddRange(SeriesTitles(edition));

            return titles.Where(x => x.IsNotNullOrWhiteSpace()).Distinct().ToList();
        }

        private static IEnumerable<string> SeriesTitles(Edition edition)
        {
            if (!(edition.Book.Value.SeriesLinks?.Value?.Any() ?? false))
            {
                yield break;
            }

            foreach (var l in edition.Book.Value.SeriesLinks.Value)
            {
                if (l.Series?.Value?.Title?.IsNotNullOrWhiteSpace() ?? false)
                {
                    yield return $"{l.Series.Value.Title} {l.Position} {edition.Title}";
                    yield return $"{l.Series.Value.Title} Book {l.Position} {edition.Title}";
                    yield return $"{edition.Title} {l.Series.Value.Title} {l.Position}";
                    yield return $"{edition.Title} {l.Series.Value.Title} Book {l.Position}";
                }
            }
        }

        private static double Closest(List<string> values, List<string> options, bool sameNumbers)
        {
            return values.SelectMany(v => options.Select(o => (Value: v, Option: o)))
                .Where(x => !sameNumbers || Numbers(x.Value).SequenceEqual(Numbers(x.Option)))
                .Select(x => Distance.StringDistance(x.Value, x.Option))
                .DefaultIfEmpty(1.0)
                .Min();
        }

        private static IEnumerable<string> Numbers(string title)
        {
            return NumbersRegex.Matches(title).Select(m => m.Value.TrimStart('0'));
        }

        // A title without its bracketed notes, unless they hold a number: "(Book 5)" is not "(Book 6)", and without
        // either the two would match
        private static string WithoutBrackets(string title)
        {
            var stripped = title.RemoveBracketsAndContents();

            return Numbers(stripped).SequenceEqual(Numbers(title)) ? stripped : null;
        }

        private static List<string> Values(List<LocalBook> localTracks, Func<LocalBook, string> selector)
        {
            return localTracks.Select(selector).Where(x => x.IsNotNullOrWhiteSpace()).Distinct().ToList();
        }

        // As ISBN-13, so an ISBN-10 in a file's tags compares with the edition's
        private static string Isbn13(string isbn)
        {
            var chars = new string((isbn ?? string.Empty).Where(c => char.IsDigit(c) || c == 'X' || c == 'x').ToArray()).ToUpperInvariant();

            if (chars.Length == 13)
            {
                return chars;
            }

            if (chars.Length != 10)
            {
                return null;
            }

            var body = "978" + chars.Substring(0, 9);
            var sum = body.Select((c, i) => (c - '0') * (i % 2 == 0 ? 1 : 3)).Sum();

            return body + ((10 - (sum % 10)) % 10);
        }

        public static List<string> GetAuthorVariants(List<string> fileAuthors)
        {
            var authors = new List<string>(fileAuthors);

            if (fileAuthors.Count == 1)
            {
                authors.AddRange(SplitAuthor(fileAuthors[0]));
            }

            foreach (var author in fileAuthors)
            {
                if (author.Contains(','))
                {
                    var split = author.Split(',', 2).Select(x => x.Trim());
                    if (!split.First().Contains(' '))
                    {
                        authors.Add(split.Reverse().ConcatToString(" "));
                    }
                }
            }

            return authors;
        }

        private static List<string> SplitAuthor(string input)
        {
            var seps = new[] { ';', '/' };
            foreach (var sep in seps)
            {
                if (input.Contains(sep))
                {
                    return input.Split(sep).Select(x => x.Trim()).ToList();
                }
            }

            var andSeps = new List<string> { " and ", " & " };
            foreach (var sep in andSeps)
            {
                if (input.Contains(sep))
                {
                    var result = new List<string>();
                    foreach (var s in input.Split(sep).Select(x => x.Trim()))
                    {
                        var s2 = SplitAuthor(s);
                        if (s2.Any())
                        {
                            result.AddRange(s2);
                        }
                        else
                        {
                            result.Add(s);
                        }
                    }

                    return result;
                }
            }

            if (input.Contains(','))
            {
                var split = input.Split(',').Select(x => x.Trim()).ToList();
                if (split[0].Contains(' '))
                {
                    return split;
                }
            }

            return new List<string>();
        }
    }
}
