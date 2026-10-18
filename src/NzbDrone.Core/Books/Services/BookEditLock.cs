using System;
using System.Collections.Concurrent;
using System.Threading;

namespace NzbDrone.Core.Books
{
    // A refresh and a metadata edit of the same book take turns. Without this a refresh that loaded the book before
    // the user saved an edit wrote its older copy back over the edit.
    public static class BookEditLock
    {
        private static readonly ConcurrentDictionary<int, object> Locks = new ConcurrentDictionary<int, object>();

        public static IDisposable Take(int bookId)
        {
            var gate = Locks.GetOrAdd(bookId, _ => new object());
            Monitor.Enter(gate);

            return new Releaser(gate);
        }

        private sealed class Releaser : IDisposable
        {
            private object _gate;

            public Releaser(object gate)
            {
                _gate = gate;
            }

            public void Dispose()
            {
                var gate = Interlocked.Exchange(ref _gate, null);

                if (gate != null)
                {
                    Monitor.Exit(gate);
                }
            }
        }
    }
}
