using System;
using System.Collections.Generic;
using System.Linq;
using Equ;
using NzbDrone.Common.Extensions;
using NzbDrone.Core.Datastore;

namespace NzbDrone.Core.Books
{
    // What the user set on a book by hand. A refresh writes the metadata source's values first, then these over the
    // top, so they last until the user clears them. Null means use the metadata source's value.
    public class BookMetadataOverrides : MemberwiseEquatable<BookMetadataOverrides>, IEmbeddedDocument
    {
        public BookMetadataOverrides()
        {
            RemovedFromSeries = new List<string>();
        }

        public string Title { get; set; }
        public DateTime? ReleaseDate { get; set; }
        public string Overview { get; set; }
        public int? PageCount { get; set; }

        // Foreign ids of series the user took the book out of, so a refresh doesn't link it again
        public List<string> RemovedFromSeries { get; set; }

        public bool IsEmpty => Title.IsNullOrWhiteSpace() &&
                               !ReleaseDate.HasValue &&
                               Overview.IsNullOrWhiteSpace() &&
                               !PageCount.HasValue &&
                               (RemovedFromSeries == null || !RemovedFromSeries.Any());

        public void ApplyTo(Book book)
        {
            if (Title.IsNotNullOrWhiteSpace())
            {
                book.Title = Title;
                book.CleanTitle = Parser.Parser.CleanAuthorName(Title);
            }

            if (ReleaseDate.HasValue)
            {
                book.ReleaseDate = ReleaseDate;
            }
        }

        // The UI shows a book's title, overview and page count from its monitored edition, which can change on any
        // import, so they go on every edition
        public void ApplyTo(Edition edition)
        {
            if (Title.IsNotNullOrWhiteSpace())
            {
                edition.Title = Title;
            }

            if (Overview.IsNotNullOrWhiteSpace())
            {
                edition.Overview = Overview;
            }

            if (PageCount.HasValue)
            {
                edition.PageCount = PageCount.Value;
            }
        }
    }
}
