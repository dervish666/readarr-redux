using System;
using System.Collections.Concurrent;

namespace NzbDrone.Core.Books
{
    public interface IMissingBookTracker
    {
        bool MissingLongEnough(Book book, DateTime now);
        DateTime DeleteAfter(Book book);
        void Found(Book book);
    }

    // A book refresh deletes only after two lookups at least Grace apart both said not found, so one bad answer from
    // the metadata source can't delete a book. Sightings live in memory: a restart starts the wait again, which only
    // ever delays a delete.
    public class MissingBookTracker : IMissingBookTracker
    {
        public static readonly TimeSpan Grace = TimeSpan.FromHours(12);

        private readonly ConcurrentDictionary<int, DateTime> _firstMissing = new ConcurrentDictionary<int, DateTime>();

        public bool MissingLongEnough(Book book, DateTime now)
        {
            var first = _firstMissing.GetOrAdd(book.Id, now);

            return now - first >= Grace;
        }

        public DateTime DeleteAfter(Book book)
        {
            return _firstMissing.TryGetValue(book.Id, out var first) ? first + Grace : DateTime.UtcNow + Grace;
        }

        public void Found(Book book)
        {
            _firstMissing.TryRemove(book.Id, out _);
        }
    }
}
