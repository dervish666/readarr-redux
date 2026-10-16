using System;
using System.Collections.Generic;
using System.Linq;
using NzbDrone.Core.Books;

namespace Readarr.Api.V1.Books
{
    // A book's hand-set metadata. Null fields use the metadata source's value.
    public class BookMetadataResource
    {
        public string Title { get; set; }
        public DateTime? ReleaseDate { get; set; }
        public string Overview { get; set; }
        public int? PageCount { get; set; }
        public List<BookSeriesLinkResource> Series { get; set; }

        // The author's series, to add the book to (read only)
        public List<BookSeriesOptionResource> AvailableSeries { get; set; }
    }

    public class BookSeriesLinkResource
    {
        public int SeriesId { get; set; }
        public string NewSeriesTitle { get; set; }
        public string SeriesTitle { get; set; }
        public string Position { get; set; }
        public bool IsManual { get; set; }
    }

    public class BookSeriesOptionResource
    {
        public int Id { get; set; }
        public string Title { get; set; }
    }

    public static class BookMetadataResourceMapper
    {
        public static BookMetadataResource ToResource(this BookMetadataEdit model, IEnumerable<NzbDrone.Core.Books.Series> availableSeries)
        {
            return new BookMetadataResource
            {
                Title = model.Title,
                ReleaseDate = model.ReleaseDate,
                Overview = model.Overview,
                PageCount = model.PageCount,
                Series = model.Series.Select(x => new BookSeriesLinkResource
                {
                    SeriesId = x.SeriesId,
                    SeriesTitle = x.SeriesTitle,
                    Position = x.Position,
                    IsManual = x.IsManual
                }).ToList(),
                AvailableSeries = availableSeries.OrderBy(x => x.Title)
                    .Select(x => new BookSeriesOptionResource { Id = x.Id, Title = x.Title })
                    .ToList()
            };
        }

        public static BookMetadataEdit ToModel(this BookMetadataResource resource)
        {
            return new BookMetadataEdit
            {
                Title = resource.Title,
                ReleaseDate = resource.ReleaseDate,
                Overview = resource.Overview,
                PageCount = resource.PageCount,
                Series = (resource.Series ?? new List<BookSeriesLinkResource>()).Select(x => new BookSeriesEdit
                {
                    SeriesId = x.SeriesId,
                    NewSeriesTitle = x.NewSeriesTitle,
                    Position = x.Position
                }).ToList()
            };
        }
    }
}
