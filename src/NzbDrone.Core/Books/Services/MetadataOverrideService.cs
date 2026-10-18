using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using NLog;
using NzbDrone.Common.Extensions;
using NzbDrone.Core.Books.Commands;
using NzbDrone.Core.Books.Events;
using NzbDrone.Core.Exceptions;
using NzbDrone.Core.Messaging.Commands;
using NzbDrone.Core.Messaging.Events;
using NzbDrone.Core.MetadataSource;

namespace NzbDrone.Core.Books
{
    public interface IMetadataOverrideService
    {
        BookMetadataEdit GetBookMetadata(int bookId);
        List<Series> GetAvailableSeries(int bookId);
        void UpdateBookMetadata(int bookId, BookMetadataEdit edit);
        void UpdateAuthorOverview(int authorId, string overview);
    }

    // A book's metadata as the user edits it. Title, ReleaseDate, Overview and PageCount are the user's values,
    // null where the metadata source's value is used.
    public class BookMetadataEdit
    {
        public BookMetadataEdit()
        {
            Series = new List<BookSeriesEdit>();
        }

        public string Title { get; set; }
        public DateTime? ReleaseDate { get; set; }
        public string Overview { get; set; }
        public int? PageCount { get; set; }
        public List<BookSeriesEdit> Series { get; set; }
    }

    public class BookSeriesEdit
    {
        // An existing series, or 0 with NewSeriesTitle to start a series of the user's own
        public int SeriesId { get; set; }
        public string NewSeriesTitle { get; set; }
        public string SeriesTitle { get; set; }
        public string Position { get; set; }
        public bool IsManual { get; set; }
    }

    public class MetadataOverrideService : IMetadataOverrideService
    {
        // Series the user starts get an id the metadata source never uses, so a refresh never matches one
        public const string LocalSeriesPrefix = "local:";

        private static readonly Regex LeadingNumber = new Regex(@"^\s*(\d+)", RegexOptions.Compiled);

        private readonly IBookService _bookService;
        private readonly IEditionService _editionService;
        private readonly IAuthorService _authorService;
        private readonly IAuthorMetadataService _authorMetadataService;
        private readonly ISeriesService _seriesService;
        private readonly ISeriesBookLinkService _linkService;
        private readonly IManageCommandQueue _commandQueueManager;
        private readonly IProvideAuthorInfo _authorInfo;
        private readonly IEventAggregator _eventAggregator;
        private readonly Logger _logger;

        public MetadataOverrideService(IBookService bookService,
                                       IEditionService editionService,
                                       IAuthorService authorService,
                                       IAuthorMetadataService authorMetadataService,
                                       ISeriesService seriesService,
                                       ISeriesBookLinkService linkService,
                                       IManageCommandQueue commandQueueManager,
                                       IProvideAuthorInfo authorInfo,
                                       IEventAggregator eventAggregator,
                                       Logger logger)
        {
            _bookService = bookService;
            _editionService = editionService;
            _authorService = authorService;
            _authorMetadataService = authorMetadataService;
            _seriesService = seriesService;
            _linkService = linkService;
            _commandQueueManager = commandQueueManager;
            _authorInfo = authorInfo;
            _eventAggregator = eventAggregator;
            _logger = logger;
        }

        public BookMetadataEdit GetBookMetadata(int bookId)
        {
            var book = _bookService.GetBook(bookId);
            var overrides = book.MetadataOverrides ?? new BookMetadataOverrides();
            var series = GetAvailableSeries(book.Id).ToDictionary(x => x.Id);

            return new BookMetadataEdit
            {
                Title = overrides.Title,
                ReleaseDate = overrides.ReleaseDate,
                Overview = overrides.Overview,
                PageCount = overrides.PageCount,
                Series = _linkService.GetLinksByBook(new List<int> { bookId })
                    .OrderBy(x => x.SeriesPosition)
                    .Select(x => new BookSeriesEdit
                    {
                        SeriesId = x.SeriesId,
                        SeriesTitle = series.TryGetValue(x.SeriesId, out var s) ? s.Title : null,
                        Position = x.Position,
                        IsManual = x.IsManual
                    })
                    .ToList()
            };
        }

        // The author's series, and any the book was taken out of: once its last link goes, a series no longer counts
        // as the author's, and the user may want the book back in it
        public List<Series> GetAvailableSeries(int bookId)
        {
            var book = _bookService.GetBook(bookId);
            var removed = book.MetadataOverrides?.RemovedFromSeries ?? new List<string>();

            return _seriesService.GetByAuthorMetadataId(book.AuthorMetadataId)
                .Concat(removed.Any() ? _seriesService.FindById(removed) : new List<Series>())
                .DistinctBy(x => x.Id)
                .ToList();
        }

        public void UpdateBookMetadata(int bookId, BookMetadataEdit edit)
        {
            var wanted = edit.Series ?? new List<BookSeriesEdit>();

            ValidateSeriesRows(wanted);

            bool cleared;
            string foreignAuthorId;

            using (BookEditLock.Take(bookId))
            {
                var book = _bookService.GetBook(bookId);
                var editions = _editionService.GetEditionsByBook(bookId);
                var old = book.MetadataOverrides ?? new BookMetadataOverrides();

                var overrides = new BookMetadataOverrides
                {
                    Title = edit.Title.IsNullOrWhiteSpace() ? null : edit.Title.Trim(),
                    ReleaseDate = edit.ReleaseDate,
                    Overview = edit.Overview.IsNullOrWhiteSpace() ? null : edit.Overview.Trim(),
                    PageCount = edit.PageCount,
                    RemovedFromSeries = old.RemovedFromSeries?.ToList() ?? new List<string>()
                };

                cleared = (old.Title != null && overrides.Title == null) ||
                          (old.ReleaseDate.HasValue && !overrides.ReleaseDate.HasValue) ||
                          (old.Overview != null && overrides.Overview == null) ||
                          (old.PageCount.HasValue && !overrides.PageCount.HasValue);

                // An edition keeps its overview when the metadata source sends none, so a cleared one must go now or
                // the user's text would stay forever
                if (old.Overview != null && overrides.Overview == null)
                {
                    editions.ForEach(x => x.Overview = string.Empty);
                }

                // Works out every series change, and fails on a bad row, before anything is written
                var plan = PlanSeries(book, overrides, wanted);

                overrides.ApplyTo(book);
                editions.ForEach(overrides.ApplyTo);
                book.MetadataOverrides = overrides;

                // The overrides go first: they hold the suppressions for the source links removed below, so if a
                // later write fails, a refresh still leaves those links out instead of bringing them back
                _bookService.UpdateMany(new List<Book> { book });
                _editionService.UpdateMany(editions);

                ApplySeries(book, plan);

                foreignAuthorId = book.AuthorMetadata?.Value?.ForeignAuthorId;

                _logger.Info("Updated the metadata of {0} by hand", book);
            }

            _authorInfo.EvictAuthor(foreignAuthorId);

            // Values the user stopped overriding come back from the metadata source
            if (cleared)
            {
                _commandQueueManager.Push(new RefreshBookCommand(bookId));
            }

            _eventAggregator.PublishEvent(new BookUpdatedEvent(_bookService.GetBook(bookId)));
        }

        public void UpdateAuthorOverview(int authorId, string overview)
        {
            var author = _authorService.GetAuthor(authorId);
            var metadata = author.Metadata.Value;
            var overrides = metadata.MetadataOverrides ?? new AuthorMetadataOverrides();
            var wasOverridden = overrides.Overview != null;

            overrides.Overview = overview.IsNullOrWhiteSpace() ? null : overview.Trim();
            metadata.MetadataOverrides = overrides;

            if (wasOverridden && overrides.Overview == null)
            {
                // Like an edition, an author keeps its overview when the source sends none, so clear it here
                metadata.Overview = string.Empty;
            }

            overrides.ApplyTo(metadata);
            _authorMetadataService.Update(metadata);

            // A refresh put the user's overview on the cached author, which would bring it back once cleared
            _authorInfo.EvictAuthor(metadata.ForeignAuthorId);

            _logger.Info("Updated the overview of {0} by hand", author);

            // Only now the override is saved and the cache gone, so the refresh brings back the source's overview
            if (wasOverridden && overrides.Overview == null)
            {
                _commandQueueManager.Push(new RefreshAuthorCommand(authorId));
            }

            _eventAggregator.PublishEvent(new AuthorUpdatedEvent(_authorService.GetAuthor(authorId)));
        }

        // A row is an existing series, or 0 with a title for a new one. Anything else used to drop out of the wanted
        // list unnoticed, and the book's existing links were deleted as if the user had removed them.
        private static void ValidateSeriesRows(List<BookSeriesEdit> wanted)
        {
            foreach (var row in wanted)
            {
                if (row == null || row.SeriesId < 0 || (row.SeriesId == 0 && row.NewSeriesTitle.IsNullOrWhiteSpace()))
                {
                    throw new NzbDroneClientException(System.Net.HttpStatusCode.BadRequest, "Each series needs an existing series id, or 0 and a title for a new series");
                }
            }
        }

        private class SeriesPlan
        {
            public List<SeriesBookLink> Removed { get; } = new List<SeriesBookLink>();
            public List<SeriesBookLink> ToAdd { get; } = new List<SeriesBookLink>();
            public List<SeriesBookLink> ToUpdate { get; } = new List<SeriesBookLink>();
            public List<Tuple<Series, SeriesBookLink>> ToCreate { get; } = new List<Tuple<Series, SeriesBookLink>>();
            public Dictionary<int, Series> Series { get; set; }
        }

        private SeriesPlan PlanSeries(Book book, BookMetadataOverrides overrides, List<BookSeriesEdit> wanted)
        {
            var plan = new SeriesPlan();
            var current = _linkService.GetLinksByBook(new List<int> { book.Id });
            var series = GetAvailableSeries(book.Id).ToDictionary(x => x.Id);

            var unknown = wanted.Where(x => x.SeriesId > 0 && !series.ContainsKey(x.SeriesId)).Select(x => x.SeriesId).Distinct().ToList();

            if (unknown.Any())
            {
                List<Series> found;

                try
                {
                    found = _seriesService.GetSeries(unknown);
                }
                catch (ApplicationException)
                {
                    // The repository throws when any id has no row
                    throw new NzbDroneClientException(System.Net.HttpStatusCode.BadRequest, "Series {0} doesn't exist", string.Join(", ", unknown));
                }

                foreach (var s in found)
                {
                    series[s.Id] = s;
                }
            }

            plan.Series = series;

            var wantedIds = wanted.Where(x => x.SeriesId > 0).Select(x => x.SeriesId).ToHashSet();

            // Taken out of a series. A link from the metadata source would come back on refresh, so remember it.
            plan.Removed.AddRange(current.Where(x => !wantedIds.Contains(x.SeriesId)));

            foreach (var link in plan.Removed.Where(x => !x.IsManual))
            {
                if (series.TryGetValue(link.SeriesId, out var s) && !overrides.RemovedFromSeries.Contains(s.ForeignSeriesId))
                {
                    overrides.RemovedFromSeries.Add(s.ForeignSeriesId);
                }
            }

            var kept = current.Except(plan.Removed).Any();

            foreach (var edit in wanted.Where(x => x.SeriesId > 0).DistinctBy(x => x.SeriesId))
            {
                var s = series[edit.SeriesId];
                var position = edit.Position.IsNullOrWhiteSpace() ? null : edit.Position.Trim();
                var existing = current.SingleOrDefault(x => x.SeriesId == edit.SeriesId);

                if (existing == null)
                {
                    plan.ToAdd.Add(NewLink(book, s.Id, position, !kept && !plan.ToAdd.Any()));
                    overrides.RemovedFromSeries.Remove(s.ForeignSeriesId);
                }
                else if (existing.Position != position)
                {
                    // Repositioned by hand, so the metadata source's position no longer applies to it
                    existing.Position = position;
                    existing.SeriesPosition = ParsePosition(position);
                    existing.IsManual = true;
                    plan.ToUpdate.Add(existing);
                }
            }

            foreach (var edit in wanted.Where(x => x.SeriesId == 0))
            {
                var created = new Series
                {
                    ForeignSeriesId = LocalSeriesPrefix + Guid.NewGuid().ToString("N"),
                    Title = edit.NewSeriesTitle.Trim(),
                    Description = string.Empty,
                    Numbered = true
                };

                var position = edit.Position.IsNullOrWhiteSpace() ? null : edit.Position.Trim();

                plan.ToCreate.Add(Tuple.Create(created, NewLink(book, 0, position, !kept && !plan.ToAdd.Any() && !plan.ToCreate.Any())));
            }

            return plan;
        }

        private static SeriesBookLink NewLink(Book book, int seriesId, string position, bool isPrimary)
        {
            return new SeriesBookLink
            {
                SeriesId = seriesId,
                BookId = book.Id,
                Position = position,
                SeriesPosition = ParsePosition(position),
                IsPrimary = isPrimary,
                IsManual = true
            };
        }

        private void ApplySeries(Book book, SeriesPlan plan)
        {
            foreach (var (created, link) in plan.ToCreate)
            {
                _seriesService.InsertMany(new List<Series> { created });
                plan.Series[created.Id] = created;
                link.SeriesId = created.Id;
                plan.ToAdd.Add(link);

                _logger.Info("Started series {0} for {1}", created.Title, book);
            }

            _linkService.DeleteMany(plan.Removed);
            _linkService.InsertMany(plan.ToAdd);
            _linkService.UpdateMany(plan.ToUpdate);

            // A series the user started and has now emptied has nothing left to show
            foreach (var link in plan.Removed)
            {
                if (plan.Series.TryGetValue(link.SeriesId, out var s) &&
                    s.ForeignSeriesId.StartsWith(LocalSeriesPrefix) &&
                    !_linkService.GetLinksBySeries(s.Id).Any())
                {
                    _seriesService.Delete(s.Id);
                }
            }
        }

        public static int ParsePosition(string position)
        {
            var match = position == null ? null : LeadingNumber.Match(position);

            return match is { Success: true } && int.TryParse(match.Groups[1].Value, out var number) ? number : 0;
        }
    }
}
