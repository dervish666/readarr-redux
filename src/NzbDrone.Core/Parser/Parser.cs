using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NLog;
using NzbDrone.Common.Extensions;
using NzbDrone.Common.Instrumentation;
using NzbDrone.Core.Books;
using NzbDrone.Core.Parser.Model;

namespace NzbDrone.Core.Parser
{
    public static class Parser
    {
        // Series numbering right next to a matched title. A marked number ("Book 6", "#5", "Vol. 2", "Books 1-3")
        // counts wherever it sits. A bare number counts only as its own token followed by a separator or the end
        // ("Green Rider 1 - ...", "Green Rider.8.Falling"), so "64 Kbps" or "12 CDs" don't, and a bare range
        // ("1-3") counts as it stands. Four-digit years never match.
        private const string SeriesPosition = @"(?<position>\d{1,3}(?:\.\d+)?)(?:\s*-\s*(?<end>\d{1,3}(?:\.\d+)?))?(?!\d)";
        private const string SeriesMarker = @"(?:\b(?:books?|bk|vol(?:ume)?|no)\.?|#)\s*";

        private static readonly Logger Logger = NzbDroneLogger.GetLogger(typeof(Parser));

        private static readonly Regex[] ReportMusicTitleRegex = new[]
        {
            // Track with author (01 - author - trackName)
            new Regex(@"(?<trackNumber>\d*){0,1}([-| ]{0,1})(?<author>[a-zA-Z0-9, ().&_]*)[-| ]{0,1}(?<trackName>[a-zA-Z0-9, ().&_]+)",
                        RegexOptions.IgnoreCase | RegexOptions.Compiled),

            // Track without author (01 - trackName)
            new Regex(@"(?<trackNumber>\d*)[-| .]{0,1}(?<trackName>[a-zA-Z0-9, ().&_]+)",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),

            // Track without trackNumber or author(trackName)
            new Regex(@"(?<trackNumber>\d*)[-| .]{0,1}(?<trackName>[a-zA-Z0-9, ().&_]+)",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),

            // Track without trackNumber and  with author(author - trackName)
            new Regex(@"(?<trackNumber>\d*)[-| .]{0,1}(?<trackName>[a-zA-Z0-9, ().&_]+)",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),

            // Track with author and starting title (01 - author - trackName)
            new Regex(@"(?<trackNumber>\d*){0,1}[-| ]{0,1}(?<author>[a-zA-Z0-9, ().&_]*)[-| ]{0,1}(?<trackName>[a-zA-Z0-9, ().&_]+)",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),
        };

        private static readonly Regex[] ReportBookTitleRegex = new[]
        {
            //ruTracker - (Genre) [Source]? Author - Discography
            new Regex(@"^(?:\(.+?\))(?:\W*(?:\[(?<source>.+?)\]))?\W*(?<author>.+?)(?: - )(?<discography>Discography|Discografia).+?(?<startyear>\d{4}).+?(?<endyear>\d{4})",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),

            //Author - Discography with two years
            new Regex(@"^(?<author>.+?)(?: - )(?:.+?)?(?<discography>Discography|Discografia).+?(?<startyear>\d{4}).+?(?<endyear>\d{4})",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),

            //Author - Discography with end year
            new Regex(@"^(?<author>.+?)(?: - )(?:.+?)?(?<discography>Discography|Discografia).+?(?<endyear>\d{4})",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),

            //Author Discography with two years
            new Regex(@"^(?<author>.+?)\W*(?<discography>Discography|Discografia).+?(?<startyear>\d{4}).+?(?<endyear>\d{4})",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),

            //Author Discography with end year
            new Regex(@"^(?<author>.+?)\W*(?<discography>Discography|Discografia).+?(?<endyear>\d{4})",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),

            //Author Discography
            new Regex(@"^(?<author>.+?)\W*(?<discography>Discography|Discografia)",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),

            //MyAnonaMouse - Title by Author [lang / pdf]
            new Regex(@"^(?<book>.+)\bby\b(?<author>.+?)(?:\[|\()",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),

            //ruTracker - (Genre) [Source]? Author - Book - Year
            new Regex(@"^(?:\(.+?\))(?:\W*(?:\[(?<source>.+?)\]))?\W*(?<author>.+?)(?: - )(?<book>.+?)(?: - )(?<releaseyear>\d{4})",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),

            //Author-Book-Version-Source-Year
            //ex. Imagine Dragons-Smoke And Mirrors-Deluxe Edition-2CD-FLAC-2015-JLM
            new Regex(@"^(?<author>.+?)[-](?<book>.+?)[-](?:[\(|\[]?)(?<version>.+?(?:Edition)?)(?:[\)|\]]?)[-](?<source>\d?CD|WEB).+?(?<releaseyear>\d{4})",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),

            //Author-Book-Source-Year
            //ex. Dani_Sbert-Togheter-WEB-2017-FURY
            new Regex(@"^(?<author>.+?)[-](?<book>.+?)[-](?<source>\d?CD|WEB).+?(?<releaseyear>\d{4})",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),

            //Author - Book (Year) Strict
            new Regex(@"^(?:(?<author>.+?)(?: - )+)(?<book>.+?)\W*(?:\(|\[).+?(?<releaseyear>\d{4})",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),

            //Author - Book (Year)
            new Regex(@"^(?:(?<author>.+?)(?: - )+)(?<book>.+?)\W*(?:\(|\[)(?<releaseyear>\d{4})",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),

            //Author - Book - Year [something]
            new Regex(@"^(?:(?<author>.+?)(?: - )+)(?<book>.+?)\W*(?: - )(?<releaseyear>\d{4})\W*(?:\(|\[)",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),

            //Author - Book [something] or Author - Book (something)
            new Regex(@"^(?:(?<author>.+?)(?: - )+)(?<book>.+?)\W*(?:\(|\[)",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),

            //Author - Book Year
            new Regex(@"^(?:(?<author>.+?)(?: - )+)(?<book>.+?)\W*(?<releaseyear>\d{4})",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),

            //Author-Book (Year) Strict
            //Hyphen no space between author and book
            new Regex(@"^(?:(?<author>.+?)(?:-)+)(?<book>.+?)\W*(?:\(|\[).+?(?<releaseyear>\d{4})",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),

            //Author-Book (Year)
            //Hyphen no space between author and book
            new Regex(@"^(?:(?<author>.+?)(?:-)+)(?<book>.+?)\W*(?:\(|\[)(?<releaseyear>\d{4})",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),

            //Author-Book [something] or Author-Book (something)
            //Hyphen no space between author and book
            new Regex(@"^(?:(?<author>.+?)(?:-)+)(?<book>.+?)\W*(?:\(|\[)",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),

            //Author-Book-something-Year
            new Regex(@"^(?:(?<author>.+?)(?:-)+)(?<book>.+?)(?:-.+?)(?<releaseyear>\d{4})",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),

            //Author-Book Year
            //Hyphen no space between author and book
            new Regex(@"^(?:(?<author>.+?)(?:-)+)(?:(?<book>.+?)(?:-)+)(?<releaseyear>\d{4})",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),

            //Author - Year - Book
            // Hypen with no or more spaces between author/book/year
            new Regex(@"^(?:(?<author>.+?)(?:-))(?<releaseyear>\d{4})(?:-)(?<book>[^-]+)",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),
        };

        private static readonly Regex[] RejectHashedReleasesRegex = new Regex[]
            {
                // Generic match for md5 and mixed-case hashes.
                new Regex(@"^[0-9a-zA-Z]{32}", RegexOptions.Compiled),

                // Generic match for shorter lower-case hashes.
                new Regex(@"^[a-z0-9]{24}$", RegexOptions.Compiled),

                // Format seen on some NZBGeek releases
                // Be very strict with these coz they are very close to the valid 101 ep numbering.
                new Regex(@"^[A-Z]{11}\d{3}$", RegexOptions.Compiled),
                new Regex(@"^[a-z]{12}\d{3}$", RegexOptions.Compiled),

                //Backup filename (Unknown origins)
                new Regex(@"^Backup_\d{5,}S\d{2}-\d{2}$", RegexOptions.Compiled),

                //123 - Started appearing December 2014
                new Regex(@"^123$", RegexOptions.Compiled),

                //abc - Started appearing January 2015
                new Regex(@"^abc$", RegexOptions.Compiled | RegexOptions.IgnoreCase),

                //b00bs - Started appearing January 2015
                new Regex(@"^b00bs$", RegexOptions.Compiled | RegexOptions.IgnoreCase)
            };

        private static readonly RegexReplace NormalizeRegex = new RegexReplace(@"((?:\b|_)(?<!^)(a(?!$)|an|the|and|or|of)(?!$)(?:\b|_))|\W|_",
                                                                string.Empty,
                                                                RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex PercentRegex = new Regex(@"(?<=\b\d+)%", RegexOptions.Compiled);

        private static readonly Regex FileExtensionRegex = new Regex(@"\.[a-z0-9]{2,4}$",
                                                                RegexOptions.IgnoreCase | RegexOptions.Compiled);

        //TODO Rework this Regex for Music
        private static readonly RegexReplace SimpleTitleRegex = new RegexReplace(@"(?:(480|720|1080|2160|320)[ip]|[xh][\W_]?26[45]|DD\W?5\W1|848x480|1280x720|1920x1080|3840x2160|4096x2160|(8|10)b(it)?)\s*",
                                                                string.Empty,
                                                                RegexOptions.IgnoreCase | RegexOptions.Compiled);

        // Valid TLDs http://data.iana.org/TLD/tlds-alpha-by-domain.txt
        private static readonly RegexReplace WebsitePrefixRegex = new RegexReplace(@"^(?:\[\s*)?(?:www\.)?[-a-z0-9-]{1,256}\.(?:[a-z]{2,6}\.[a-z]{2,6}|xn--[a-z0-9-]{4,}|[a-z]{2,})\b(?:\s*\]|[ -]{2,})[ -]*",
                                                                string.Empty,
                                                                RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly RegexReplace WebsitePostfixRegex = new RegexReplace(@"(?:\[\s*)?(?:www\.)?[-a-z0-9-]{1,256}\.(?:xn--[a-z0-9-]{4,}|[a-z]{2,6})\b(?:\s*\])$",
                                                                string.Empty,
                                                                RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex AirDateRegex = new Regex(@"^(.*?)(?<!\d)((?<airyear>\d{4})[_.-](?<airmonth>[0-1][0-9])[_.-](?<airday>[0-3][0-9])|(?<airmonth>[0-1][0-9])[_.-](?<airday>[0-3][0-9])[_.-](?<airyear>\d{4}))(?!\d)",
                                                                RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex SixDigitAirDateRegex = new Regex(@"(?<=[_.-])(?<airdate>(?<!\d)(?<airyear>[1-9]\d{1})(?<airmonth>[0-1][0-9])(?<airday>[0-3][0-9]))(?=[_.-])",
                                                                RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly RegexReplace CleanReleaseGroupRegex = new RegexReplace(@"^(.*?[-._ ])|(-(RP|1|NZBGeek|Obfuscated|Scrambled|sample|Pre|postbot|xpost|Rakuv[a-z0-9]*|WhiteRev|BUYMORE|AsRequested|AlternativeToRequested|GEROV|Z0iDS3N|Chamele0n|4P|4Planet))+$",
                                                                string.Empty,
                                                                RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly RegexReplace CleanTorrentSuffixRegex = new RegexReplace(@"\[(?:ettv|rartv|rarbg|cttv)\]$",
                                                                string.Empty,
                                                                RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex ReleaseGroupRegex = new Regex(@"-(?<releasegroup>[a-z0-9]+)(?<!MP3|ALAC|FLAC|WEB)(?:\b|[-._ ])",
                                                                RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex AnimeReleaseGroupRegex = new Regex(@"^(?:\[(?<subgroup>(?!\s).+?(?<!\s))\](?:_|-|\s|\.)?)",
                                                                RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex YearInTitleRegex = new Regex(@"^(?<title>.+?)(?:\W|_)?(?<year>\d{4})",
                                                                RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly HashSet<char> WordDelimiters = new HashSet<char>(" .,_-=()[]|\"`'’");
        private static readonly Regex WordDelimiterRegex = new Regex(@"(\s|\.|,|_|-|=|\(|\)|\[|\]|\|)+", RegexOptions.Compiled);
        private static readonly Regex PunctuationRegex = new Regex(@"[^\w\s]", RegexOptions.Compiled);
        private static readonly Regex CommonWordRegex = new Regex(@"\b(a|an|the|and|or|of)\b\s?", RegexOptions.IgnoreCase | RegexOptions.Compiled);
        private static readonly Regex SpecialEpisodeWordRegex = new Regex(@"\b(part|special|edition|christmas)\b\s?", RegexOptions.IgnoreCase | RegexOptions.Compiled);
        private static readonly Regex DuplicateSpacesRegex = new Regex(@"\s{2,}", RegexOptions.Compiled);

        private static readonly Regex RequestInfoRegex = new Regex(@"\[.+?\]", RegexOptions.Compiled);

        private static readonly string[] Numbers = new[] { "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine" };

        private static readonly Regex[] CommonTagRegex = new Regex[]
        {
            new Regex(@"(\[|\()*\b((featuring|feat.|feat|ft|ft.)\s{1}){1}\s*.*(\]|\))*", RegexOptions.IgnoreCase | RegexOptions.Compiled),
            new Regex(@"(?:\(|\[)(?:[^\(\[]*)(?:version|limited|deluxe|single|clean|book|special|bonus|promo|remastered)(?:[^\)\]]*)(?:\)|\])", RegexOptions.IgnoreCase | RegexOptions.Compiled)
        };

        private static readonly Regex[] BracketRegex = new Regex[]
        {
            new Regex(@"\(.*\)", RegexOptions.Compiled),
            new Regex(@"\[.*\]", RegexOptions.Compiled)
        };

        private static readonly Regex AfterDashRegex = new Regex(@"[-:].*", RegexOptions.Compiled);

        private static readonly Regex[] SeriesPositionAfterTitleRegex = new[]
        {
            new Regex(@"^[\s.,_:(\[-]*" + SeriesMarker + SeriesPosition, RegexOptions.IgnoreCase | RegexOptions.Compiled),
            new Regex(@"^(?:\s*[-:,]\s*|\s+|[._])(?<position>\d{1,3})\s*-\s*(?<end>\d{1,3})(?!\d)", RegexOptions.IgnoreCase | RegexOptions.Compiled),
            new Regex(@"^(?:\s*[-:,]\s*|\s+|[._])(?<position>\d{1,3}(?:\.\d+)?)(?=\s*(?:[-:._(\[)\]]|$))", RegexOptions.IgnoreCase | RegexOptions.Compiled)
        };

        private static readonly Regex[] SeriesPositionBeforeTitleRegex = new[]
        {
            new Regex(SeriesMarker + SeriesPosition + @"[\s.,_:)\]-]*$", RegexOptions.IgnoreCase | RegexOptions.Compiled),
            new Regex(@"(?:^|[\s.,_:(\[-])" + SeriesPosition + @"(?:\s*[-:.]\s*|[._])$", RegexOptions.IgnoreCase | RegexOptions.Compiled)
        };

        public static ParsedTrackInfo ParseMusicPath(string path)
        {
            var fileInfo = new FileInfo(path);

            ParsedTrackInfo result = null;

            Logger.Debug("Attempting to parse book info using directory and file names. {0}", fileInfo.Directory.Name);
            result = ParseTitle(fileInfo.Directory.Name + " " + fileInfo.Name);

            if (result == null)
            {
                Logger.Debug("Attempting to parse book info using directory name. {0}", fileInfo.Directory.Name);
                result = ParseTitle(fileInfo.Directory.Name + fileInfo.Extension);
            }

            return result;
        }

        public static ParsedTrackInfo ParseTitle(string title)
        {
            try
            {
                if (!ValidateBeforeParsing(title))
                {
                    return null;
                }

                Logger.Debug("Parsing string '{0}'", title);

                var releaseTitle = RemoveFileExtension(title);

                releaseTitle = releaseTitle.Replace("【", "[").Replace("】", "]");

                var simpleTitle = SimpleTitleRegex.Replace(releaseTitle);

                // TODO: Quick fix stripping [url] - prefixes.
                simpleTitle = WebsitePrefixRegex.Replace(simpleTitle);
                simpleTitle = WebsitePostfixRegex.Replace(simpleTitle);

                simpleTitle = CleanTorrentSuffixRegex.Replace(simpleTitle);

                var airDateMatch = AirDateRegex.Match(simpleTitle);
                if (airDateMatch.Success)
                {
                    simpleTitle = airDateMatch.Groups[1].Value + airDateMatch.Groups["airyear"].Value + "." + airDateMatch.Groups["airmonth"].Value + "." + airDateMatch.Groups["airday"].Value;
                }

                var sixDigitAirDateMatch = SixDigitAirDateRegex.Match(simpleTitle);
                if (sixDigitAirDateMatch.Success)
                {
                    var airYear = sixDigitAirDateMatch.Groups["airyear"].Value;
                    var airMonth = sixDigitAirDateMatch.Groups["airmonth"].Value;
                    var airDay = sixDigitAirDateMatch.Groups["airday"].Value;

                    if (airMonth != "00" || airDay != "00")
                    {
                        var fixedDate = string.Format("20{0}.{1}.{2}", airYear, airMonth, airDay);

                        simpleTitle = simpleTitle.Replace(sixDigitAirDateMatch.Groups["airdate"].Value, fixedDate);
                    }
                }

                foreach (var regex in ReportMusicTitleRegex)
                {
                    var match = regex.Matches(simpleTitle);

                    if (match.Count != 0)
                    {
                        Logger.Trace(regex);
                        try
                        {
                            var result = ParseMatchMusicCollection(match);

                            if (result != null)
                            {
                                result.Quality = QualityParser.ParseQuality(title);
                                Logger.Debug("Quality parsed: {0}", result.Quality);

                                return result;
                            }
                        }
                        catch (InvalidDateException ex)
                        {
                            Logger.Debug(ex, ex.Message);
                            break;
                        }
                    }
                }
            }
            catch (Exception e)
            {
                if (!title.ToLower().Contains("password") && !title.ToLower().Contains("yenc"))
                {
                    Logger.Error(e, "An error has occurred while trying to parse {0}", title);
                }
            }

            Logger.Debug("Unable to parse {0}", title);
            return null;
        }

        public static ParsedBookInfo ParseBookTitleWithSearchCriteria(string title, Author author, List<Book> books)
        {
            try
            {
                if (!ValidateBeforeParsing(title))
                {
                    return null;
                }

                var authorName = author.Name == "Various Authors" ? "VA" : author.Name.RemoveAccent();

                Logger.Debug("Parsing string '{0}' using search criteria author: '{1}' books: '{2}'",
                             title,
                             authorName.RemoveAccent(),
                             string.Join(", ", books.Select(a => a.Title.RemoveAccent())));

                var releaseTitle = RemoveFileExtension(title);

                var simpleTitle = SimpleTitleRegex.Replace(releaseTitle);

                simpleTitle = WebsitePrefixRegex.Replace(simpleTitle);
                simpleTitle = WebsitePostfixRegex.Replace(simpleTitle);

                simpleTitle = CleanTorrentSuffixRegex.Replace(simpleTitle);

                // A book should have exactly one monitored edition, but don't let one that has none or several
                // break parsing for every release in the search
                var best = books
                    .Select(x => (Book: x, Edition: x.Editions.Value.FirstOrDefault(e => e.Monitored) ?? x.Editions.Value.FirstOrDefault()))
                    .Where(x => x.Edition != null)
                    .OrderByDescending(x => simpleTitle.FuzzyMatch(x.Edition.Title, wordDelimiters: WordDelimiters))
                    .FirstOrDefault();

                if (best.Edition == null)
                {
                    return null;
                }

                var bestBook = best.Edition;

                var foundAuthor = GetTitleFuzzy(simpleTitle, authorName, out var remainder);

                if (foundAuthor == null)
                {
                    foundAuthor = GetTitleFuzzy(simpleTitle, authorName.ToLastFirst(), out remainder);
                }

                var foundBook = GetTitleFuzzy(remainder, bestBook.Title, out _, out var beforeBook, out var afterBook);

                if (foundBook == null)
                {
                    foundBook = GetTitleFuzzy(remainder, bestBook.Title.SplitBookTitle(authorName).Item1, out _, out beforeBook, out afterBook);
                }

                Logger.Trace($"Found {foundAuthor} - {foundBook} with fuzzy parser");

                if (foundAuthor == null || foundBook == null)
                {
                    return null;
                }

                if (IsOtherBookInSeries(beforeBook, afterBook, best.Book))
                {
                    Logger.Debug("'{0}' names '{1}' as its series, not as its title", title, foundBook);
                    return null;
                }

                var result = new ParsedBookInfo
                {
                    AuthorName = foundAuthor,
                    AuthorTitleInfo = GetAuthorTitleInfo(foundAuthor),
                    BookTitle = foundBook
                };

                try
                {
                    result.Quality = QualityParser.ParseQuality(title);
                    Logger.Debug("Quality parsed: {0}", result.Quality);

                    result.ReleaseGroup = ParseReleaseGroup(releaseTitle);

                    Logger.Debug("Release Group parsed: {0}", result.ReleaseGroup);

                    return result;
                }
                catch (InvalidDateException ex)
                {
                    Logger.Debug(ex, ex.Message);
                }
            }
            catch (Exception e)
            {
                if (!title.ToLower().Contains("password") && !title.ToLower().Contains("yenc"))
                {
                    Logger.Error(e, "An error has occurred while trying to parse {0}", title);
                }
            }

            Logger.Debug("Unable to parse {0}", title);
            return null;
        }

        public static string GetTitleFuzzy(string report, string name, out string remainder)
        {
            return GetTitleFuzzy(report, name, out remainder, out _, out _);
        }

        private static string GetTitleFuzzy(string report, string name, out string remainder, out string preceding, out string following)
        {
            remainder = report;
            preceding = string.Empty;
            following = string.Empty;

            Logger.Trace($"Finding '{name}' in '{report}'");

            var (locStart, matchLength, score) = report.ToLowerInvariant().FuzzyMatch(name.ToLowerInvariant(), 0.6, WordDelimiters);

            if (locStart == -1)
            {
                return null;
            }

            var found = report.Substring(locStart, matchLength);

            if (score >= 0.8)
            {
                remainder = report.Remove(locStart, matchLength);
                preceding = report.Substring(0, locStart);
                following = report.Substring(locStart + matchLength);
                return found.Replace('.', ' ').Replace('_', ' ');
            }

            return null;
        }

        // A series that shares its name with its first book puts that name in every later book's release title,
        // e.g. "Firebrand: Green Rider, Book 6" or "Book 6 - Green Rider - Firebrand". If series numbering next to
        // the matched title isn't one of the book's own positions, the release is a different book in that series.
        private static bool IsOtherBookInSeries(string beforeTitle, string afterTitle, Book book)
        {
            var match = SeriesPositionAfterTitleRegex.Select(x => x.Match(afterTitle)).FirstOrDefault(x => x.Success) ??
                        SeriesPositionBeforeTitleRegex.Select(x => x.Match(beforeTitle)).FirstOrDefault(x => x.Success);

            if (match == null)
            {
                return false;
            }

            var positions = (book.SeriesLinks?.Value ?? new List<SeriesBookLink>())
                .Select(x => ParseSeriesPosition(x.Position))
                .Where(x => x != null)
                .ToList();

            if (!positions.Any())
            {
                return false;
            }

            var releasePosition = match.Groups["end"].Success
                ? $"{match.Groups["position"].Value}-{match.Groups["end"].Value}"
                : match.Groups["position"].Value;

            return !positions.Contains(ParseSeriesPosition(releasePosition));
        }

        // "6", "06" and "6.0" are one position, and "1-3" is a range that only matches the same range
        private static string ParseSeriesPosition(string position)
        {
            var parts = (position ?? string.Empty).Split('-');

            if (parts.Length > 2)
            {
                return null;
            }

            var numbers = parts.Select(x => decimal.TryParse(x.Trim(), NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var number) ? number : (decimal?)null).ToList();

            return numbers.All(x => x.HasValue) ? numbers.Select(x => x.Value.ToString("0.###", CultureInfo.InvariantCulture)).ConcatToString("-") : null;
        }

        public static ParsedBookInfo ParseBookTitle(string title)
        {
            try
            {
                if (!ValidateBeforeParsing(title))
                {
                    return null;
                }

                Logger.Debug("Parsing string '{0}'", title);

                var releaseTitle = RemoveFileExtension(title);

                var simpleTitle = SimpleTitleRegex.Replace(releaseTitle);

                // TODO: Quick fix stripping [url] - prefixes.
                simpleTitle = WebsitePrefixRegex.Replace(simpleTitle);
                simpleTitle = WebsitePostfixRegex.Replace(simpleTitle);

                simpleTitle = CleanTorrentSuffixRegex.Replace(simpleTitle);

                var airDateMatch = AirDateRegex.Match(simpleTitle);
                if (airDateMatch.Success)
                {
                    simpleTitle = airDateMatch.Groups[1].Value + airDateMatch.Groups["airyear"].Value + "." + airDateMatch.Groups["airmonth"].Value + "." + airDateMatch.Groups["airday"].Value;
                }

                var sixDigitAirDateMatch = SixDigitAirDateRegex.Match(simpleTitle);
                if (sixDigitAirDateMatch.Success)
                {
                    var airYear = sixDigitAirDateMatch.Groups["airyear"].Value;
                    var airMonth = sixDigitAirDateMatch.Groups["airmonth"].Value;
                    var airDay = sixDigitAirDateMatch.Groups["airday"].Value;

                    if (airMonth != "00" || airDay != "00")
                    {
                        var fixedDate = string.Format("20{0}.{1}.{2}", airYear, airMonth, airDay);

                        simpleTitle = simpleTitle.Replace(sixDigitAirDateMatch.Groups["airdate"].Value, fixedDate);
                    }
                }

                foreach (var regex in ReportBookTitleRegex)
                {
                    var match = regex.Matches(simpleTitle);

                    if (match.Count != 0)
                    {
                        Logger.Trace(regex);
                        try
                        {
                            var result = ParseBookMatchCollection(match, releaseTitle);

                            if (result != null)
                            {
                                result.Quality = QualityParser.ParseQuality(title);
                                Logger.Debug("Quality parsed: {0}", result.Quality);

                                result.ReleaseGroup = ParseReleaseGroup(releaseTitle);

                                var subGroup = GetSubGroup(match);
                                if (!subGroup.IsNullOrWhiteSpace())
                                {
                                    result.ReleaseGroup = subGroup;
                                }

                                Logger.Debug("Release Group parsed: {0}", result.ReleaseGroup);

                                result.ReleaseHash = GetReleaseHash(match);
                                if (!result.ReleaseHash.IsNullOrWhiteSpace())
                                {
                                    Logger.Debug("Release Hash parsed: {0}", result.ReleaseHash);
                                }

                                return result;
                            }
                        }
                        catch (InvalidDateException ex)
                        {
                            Logger.Debug(ex, ex.Message);
                            break;
                        }
                    }
                }
            }
            catch (Exception e)
            {
                if (!title.ToLower().Contains("password") && !title.ToLower().Contains("yenc"))
                {
                    Logger.Error(e, "An error has occurred while trying to parse {0}", title);
                }
            }

            Logger.Debug("Unable to parse {0}", title);
            return null;
        }

        public static (string, string) SplitBookTitle(this string book, string author)
        {
            // Strip author from title, eg Tom Clancy: Ghost Protocol
            if (book.StartsWith($"{author}:"))
            {
                book = book.Split(':', 2)[1].Trim();
            }

            var parenthesis = book.IndexOf('(');
            var colon = book.IndexOf(':');

            string[] parts = null;

            if (parenthesis > -1)
            {
                var endParenthesis = book.IndexOf(')', parenthesis);
                if (endParenthesis == -1 || !book.Substring(parenthesis + 1, endParenthesis - parenthesis).Contains(' '))
                {
                    parenthesis = -1;
                }
            }

            if (colon > -1 && parenthesis > -1)
            {
                if (colon < parenthesis)
                {
                    parts = book.Split(':', 2);
                }
                else
                {
                    parts = book.Split('(', 2);
                    parts[1] = parts[1].TrimEnd(')');
                }
            }
            else if (colon > -1)
            {
                parts = book.Split(':', 2);
            }
            else if (parenthesis > -1)
            {
                parts = book.Split('(');
                parts[1] = parts[1].TrimEnd(')');
            }

            if (parts != null)
            {
                return (parts[0].Trim(), parts[1].TrimEnd(':').Trim());
            }

            return (book, string.Empty);
        }

        public static string CleanAuthorName(this string name)
        {
            if (name.IsNullOrWhiteSpace())
            {
                return string.Empty;
            }

            // If Title only contains numbers return it as is.
            if (long.TryParse(name, out _))
            {
                return name;
            }

            name = PercentRegex.Replace(name, "percent");

            return NormalizeRegex.Replace(name).ToLower().RemoveAccent();
        }

        public static string NormalizeTrackTitle(this string title)
        {
            title = SpecialEpisodeWordRegex.Replace(title, string.Empty);
            title = PunctuationRegex.Replace(title, " ");
            title = DuplicateSpacesRegex.Replace(title, " ");

            return title.Trim().ToLower();
        }

        public static string NormalizeTitle(string title)
        {
            title = WordDelimiterRegex.Replace(title, " ");
            title = PunctuationRegex.Replace(title, string.Empty);
            title = CommonWordRegex.Replace(title, string.Empty);
            title = DuplicateSpacesRegex.Replace(title, " ");

            return title.Trim().ToLower();
        }

        public static string ParseReleaseGroup(string title)
        {
            title = title.Trim();
            title = RemoveFileExtension(title);
            title = WebsitePrefixRegex.Replace(title);

            var animeMatch = AnimeReleaseGroupRegex.Match(title);

            if (animeMatch.Success)
            {
                return animeMatch.Groups["subgroup"].Value;
            }

            title = CleanReleaseGroupRegex.Replace(title);

            var matches = ReleaseGroupRegex.Matches(title);

            if (matches.Count != 0)
            {
                var group = matches.OfType<Match>().Last().Groups["releasegroup"].Value;

                if (int.TryParse(group, out _))
                {
                    return null;
                }

                return group;
            }

            return null;
        }

        public static string RemoveFileExtension(string title)
        {
            title = FileExtensionRegex.Replace(title, m =>
            {
                var extension = m.Value.ToLower();
                if (MediaFiles.MediaFileExtensions.AllExtensions.Contains(extension) || new[] { ".par2", ".nzb" }.Contains(extension))
                {
                    return string.Empty;
                }

                return m.Value;
            });

            return title;
        }

        public static string CleanBookTitle(this string book)
        {
            return CommonTagRegex[1].Replace(book, string.Empty).Trim();
        }

        public static string RemoveBracketsAndContents(this string book)
        {
            var intermediate = book;
            foreach (var regex in BracketRegex)
            {
                intermediate = regex.Replace(intermediate, string.Empty).Trim();
            }

            return intermediate;
        }

        public static string RemoveAfterDash(this string text)
        {
            return AfterDashRegex.Replace(text, string.Empty).Trim();
        }

        public static string CleanTrackTitle(this string title)
        {
            var intermediateTitle = title;
            foreach (var regex in CommonTagRegex)
            {
                intermediateTitle = regex.Replace(intermediateTitle, string.Empty).Trim();
            }

            return intermediateTitle;
        }

        private static ParsedTrackInfo ParseMatchMusicCollection(MatchCollection matchCollection)
        {
            var authorName = matchCollection[0].Groups["author"].Value./*Removed for cases like Will.I.Am Replace('.', ' ').*/Replace('_', ' ');
            authorName = RequestInfoRegex.Replace(authorName, "").Trim(' ');

            // Coppied from Radarr (https://github.com/Radarr/Radarr/blob/develop/src/NzbDrone.Core/Parser/Parser.cs)
            // TODO: Split into separate method and write unit tests for.
            var parts = authorName.Split('.');
            authorName = "";
            var n = 0;
            var previousAcronym = false;
            var nextPart = "";
            foreach (var part in parts)
            {
                if (parts.Length >= n + 2)
                {
                    nextPart = parts[n + 1];
                }

                if (part.Length == 1 && part.ToLower() != "a" && !int.TryParse(part, out n))
                {
                    authorName += part + ".";
                    previousAcronym = true;
                }
                else if (part.ToLower() == "a" && (previousAcronym == true || nextPart.Length == 1))
                {
                    authorName += part + ".";
                    previousAcronym = true;
                }
                else
                {
                    if (previousAcronym)
                    {
                        authorName += " ";
                        previousAcronym = false;
                    }

                    authorName += part + " ";
                }

                n++;
            }

            authorName = authorName.Trim(' ');

            var result = new ParsedTrackInfo();

            result.Authors = new List<string> { authorName };

            Logger.Debug("Track Parsed. {0}", result);
            return result;
        }

        private static AuthorTitleInfo GetAuthorTitleInfo(string title)
        {
            var authorTitleInfo = new AuthorTitleInfo();
            authorTitleInfo.Title = title;

            return authorTitleInfo;
        }

        public static string ParseAuthorName(string title)
        {
            Logger.Debug("Parsing string '{0}'", title);

            var parseResult = ParseBookTitle(title);

            if (parseResult == null)
            {
                return CleanAuthorName(title);
            }

            return parseResult.AuthorName;
        }

        private static ParsedBookInfo ParseBookMatchCollection(MatchCollection matchCollection, string releaseTitle)
        {
            var authorName = matchCollection[0].Groups["author"].Value.Replace('.', ' ').Replace('_', ' ');
            var bookTitle = matchCollection[0].Groups["book"].Value.Replace('.', ' ').Replace('_', ' ');
            var releaseVersion = matchCollection[0].Groups["version"].Value.Replace('.', ' ').Replace('_', ' ');
            authorName = RequestInfoRegex.Replace(authorName, "").Trim(' ');
            bookTitle = RequestInfoRegex.Replace(bookTitle, "").Trim(' ');
            releaseVersion = RequestInfoRegex.Replace(releaseVersion, "").Trim(' ');

            int.TryParse(matchCollection[0].Groups["releaseyear"].Value, out var releaseYear);

            ParsedBookInfo result;

            result = new ParsedBookInfo
            {
                ReleaseTitle = releaseTitle
            };

            result.AuthorName = authorName;
            result.BookTitle = bookTitle;
            result.AuthorTitleInfo = GetAuthorTitleInfo(result.AuthorName);
            result.ReleaseDate = releaseYear.ToString();
            result.ReleaseVersion = releaseVersion;

            if (matchCollection[0].Groups["discography"].Success)
            {
                int.TryParse(matchCollection[0].Groups["startyear"].Value, out var discStart);
                int.TryParse(matchCollection[0].Groups["endyear"].Value, out var discEnd);
                result.Discography = true;

                if (discStart > 0 && discEnd > 0)
                {
                    result.DiscographyStart = discStart;
                    result.DiscographyEnd = discEnd;
                }
                else if (discEnd > 0)
                {
                    result.DiscographyEnd = discEnd;
                }

                result.BookTitle = "Discography";
            }

            Logger.Debug("Book Parsed. {0}", result);

            return result;
        }

        private static bool ValidateBeforeParsing(string title)
        {
            if (title.ToLower().Contains("password") && title.ToLower().Contains("yenc"))
            {
                Logger.Debug("");
                return false;
            }

            if (!title.Any(char.IsLetterOrDigit))
            {
                return false;
            }

            var titleWithoutExtension = RemoveFileExtension(title);

            if (RejectHashedReleasesRegex.Any(v => v.IsMatch(titleWithoutExtension)))
            {
                Logger.Debug("Rejected Hashed Release Title: " + title);
                return false;
            }

            return true;
        }

        private static string GetSubGroup(MatchCollection matchCollection)
        {
            var subGroup = matchCollection[0].Groups["subgroup"];

            if (subGroup.Success)
            {
                return subGroup.Value;
            }

            return string.Empty;
        }

        private static string GetReleaseHash(MatchCollection matchCollection)
        {
            var hash = matchCollection[0].Groups["hash"];

            if (hash.Success)
            {
                var hashValue = hash.Value.Trim('[', ']');

                if (hashValue.Equals("1280x720"))
                {
                    return string.Empty;
                }

                return hashValue;
            }

            return string.Empty;
        }

        private static int ParseNumber(string value)
        {
            if (int.TryParse(value, out var number))
            {
                return number;
            }

            number = Array.IndexOf(Numbers, value.ToLower());

            if (number != -1)
            {
                return number;
            }

            throw new FormatException(string.Format("{0} isn't a number", value));
        }
    }
}
