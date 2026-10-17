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
        private readonly IEventAggregator _eventAggregator;
        private readonly Logger _logger;

        public MetadataOverrideService(IBookService bookService,
                                       IEditionService editionService,
                                       IAuthorService authorService,
                                       IAuthorMetadataService authorMetadataService,
                                       ISeriesService seriesService,
                                       ISeriesBookLinkService linkService,
                                       IManageCommandQueue commandQueueManager,
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
            bool cleared;

            // A refresh of this book waits until the edit is saved, and an edit waits for a running refresh
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

                UpdateSeries(book, overrides, edit.Series ?? new List<BookSeriesEdit>());

                overrides.ApplyTo(book);
                editions.ForEach(overrides.ApplyTo);
                book.MetadataOverrides = overrides;

                _bookService.UpdateMany(new List<Book> { book });
                _editionService.UpdateMany(editions);

                _logger.Info("Updated the metadata of {0} by hand", book);
            }

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
                // Like an edition, an author keeps its overview when the source sends none, so clear it here and let
                // a refresh bring the source's back
                metadata.Overview = string.Empty;
                _commandQueueManager.Push(new RefreshAuthorCommand(authorId));
            }

            overrides.ApplyTo(metadata);
            _authorMetadataService.Update(metadata);

            _logger.Info("Updated the overview of {0} by hand", author);

            _eventAggregator.PublishEvent(new AuthorUpdatedEvent(_authorService.GetAuthor(authorId)));
        }

        private void UpdateSeries(Book book, BookMetadataOverrides overrides, List<BookSeriesEdit> wanted)
        {
            var current = _linkService.GetLinksByBook(new List<int> { book.Id });
            var series = GetAvailableSeries(book.Id).ToDictionary(x => x.Id);

            var unknown = wanted.Where(x => x.SeriesId > 0 && !series.ContainsKey(x.SeriesId)).Select(x => x.SeriesId).ToList();

            foreach (var s in unknown.Any() ? _seriesService.GetSeries(unknown) : new List<Series>())
            {
                series[s.Id] = s;
            }

            foreach (var edit in wanted.Where(x => x.SeriesId == 0 && x.NewSeriesTitle.IsNotNullOrWhiteSpace()))
            {
                var created = new Series
                {
                    ForeignSeriesId = LocalSeriesPrefix + Guid.NewGuid().ToString("N"),
                    Title = edit.NewSeriesTitle.Trim(),
                    Description = string.Empty,
                    Numbered = true
                };

                _seriesService.InsertMany(new List<Series> { created });
                series[created.Id] = created;
                edit.SeriesId = created.Id;

                _logger.Info("Started series {0} for {1}", created.Title, book);
            }

            var wantedIds = wanted.Where(x => x.SeriesId > 0).Select(x => x.SeriesId).ToHashSet();

            // Taken out of a series. A link from the metadata source would come back on refresh, so remember it.
            var removed = current.Where(x => !wantedIds.Contains(x.SeriesId)).ToList();

            foreach (var link in removed.Where(x => !x.IsManual))
            {
                if (series.TryGetValue(link.SeriesId, out var s) && !overrides.RemovedFromSeries.Contains(s.ForeignSeriesId))
                {
                    overrides.RemovedFromSeries.Add(s.ForeignSeriesId);
                }
            }

            _linkService.DeleteMany(removed);

            var toAdd = new List<SeriesBookLink>();
            var toUpdate = new List<SeriesBookLink>();

            foreach (var edit in wanted.Where(x => x.SeriesId > 0).DistinctBy(x => x.SeriesId))
            {
                if (!series.TryGetValue(edit.SeriesId, out var s))
                {
                    throw new NzbDroneClientException(System.Net.HttpStatusCode.BadRequest, "Series {0} doesn't exist", edit.SeriesId);
                }

                var position = edit.Position.IsNullOrWhiteSpace() ? null : edit.Position.Trim();
                var existing = current.SingleOrDefault(x => x.SeriesId == edit.SeriesId);

                if (existing == null)
                {
                    toAdd.Add(new SeriesBookLink
                    {
                        SeriesId = s.Id,
                        BookId = book.Id,
                        Position = position,
                        SeriesPosition = ParsePosition(position),
                        IsPrimary = !current.Except(removed).Any() && !toAdd.Any(),
                        IsManual = true
                    });

                    overrides.RemovedFromSeries.Remove(s.ForeignSeriesId);
                }
                else if (existing.Position != position)
                {
                    // Repositioned by hand, so the metadata source's position no longer applies to it
                    existing.Position = position;
                    existing.SeriesPosition = ParsePosition(position);
                    existing.IsManual = true;
                    toUpdate.Add(existing);
                }
            }

            _linkService.InsertMany(toAdd);
            _linkService.UpdateMany(toUpdate);

            // A series the user started and has now emptied has nothing left to show
            foreach (var link in removed)
            {
                if (series.TryGetValue(link.SeriesId, out var s) &&
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
