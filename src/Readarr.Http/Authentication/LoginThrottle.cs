using System;
using System.Collections.Concurrent;
using System.Linq;

namespace Readarr.Http.Authentication
{
    public interface ILoginThrottle
    {
        TimeSpan GetRetryDelay(string clientAddress, string username);
        bool TryBeginAttempt(string clientAddress, string username, out TimeSpan retryDelay);
        void EndAttempt(string clientAddress, string username, bool succeeded);
        void AbandonAttempt(string clientAddress, string username);
    }

    // Slows password guessing. Failures are counted per client address and username, and
    // separately per address across all usernames. After the free failures each further failure
    // doubles the wait before the next attempt is checked, up to a cap. Nothing is permanent: a
    // success or a quiet spell clears it, and other addresses are unaffected, so a guesser can't
    // lock the real user out.
    //
    // An attempt is reserved before the password is checked and counts against the limit while
    // it runs, so parallel requests can't all slip through before the first failure is recorded.
    public class LoginThrottle : ILoginThrottle
    {
        public const int FreeAttempts = 5;
        public const int SourceFreeAttempts = 20;
        public const int MaxEntries = 10000;
        public static readonly TimeSpan MaxDelay = TimeSpan.FromSeconds(30);
        public static readonly TimeSpan ForgetAfter = TimeSpan.FromMinutes(15);

        private readonly ConcurrentDictionary<string, Attempts> _byUser = new ConcurrentDictionary<string, Attempts>();
        private readonly ConcurrentDictionary<string, Attempts> _bySource = new ConcurrentDictionary<string, Attempts>();

        public TimeSpan GetRetryDelay(string clientAddress, string username)
        {
            var now = GetUtcNow();

            return Max(Peek(_byUser, GetKey(clientAddress, username), FreeAttempts, now),
                       Peek(_bySource, clientAddress ?? string.Empty, SourceFreeAttempts, now));
        }

        public bool TryBeginAttempt(string clientAddress, string username, out TimeSpan retryDelay)
        {
            var now = GetUtcNow();
            var source = GetOrAdd(_bySource, clientAddress ?? string.Empty, SourceFreeAttempts, now);
            var user = GetOrAdd(_byUser, GetKey(clientAddress, username), FreeAttempts, now);

            // Always the address first, then the username, so two requests can't deadlock
            lock (source)
            {
                lock (user)
                {
                    retryDelay = Max(GetRetryDelay(user, FreeAttempts, now), GetRetryDelay(source, SourceFreeAttempts, now));

                    if (retryDelay > TimeSpan.Zero)
                    {
                        return false;
                    }

                    source.InFlight++;
                    user.InFlight++;

                    return true;
                }
            }
        }

        public void EndAttempt(string clientAddress, string username, bool succeeded)
        {
            var sourceKey = clientAddress ?? string.Empty;
            var userKey = GetKey(clientAddress, username);

            if (succeeded)
            {
                _byUser.TryRemove(userKey, out _);
                _bySource.TryRemove(sourceKey, out _);

                return;
            }

            var now = GetUtcNow();

            RecordFailure(_bySource, sourceKey, now);
            RecordFailure(_byUser, userKey, now);
        }

        // The check never finished (an error, not a wrong password), so release the slot uncounted
        public void AbandonAttempt(string clientAddress, string username)
        {
            Release(_bySource, clientAddress ?? string.Empty);
            Release(_byUser, GetKey(clientAddress, username));
        }

        protected virtual DateTime GetUtcNow()
        {
            return DateTime.UtcNow;
        }

        private static TimeSpan Peek(ConcurrentDictionary<string, Attempts> map, string key, int freeAttempts, DateTime now)
        {
            if (!map.TryGetValue(key, out var attempts))
            {
                return TimeSpan.Zero;
            }

            lock (attempts)
            {
                return GetRetryDelay(attempts, freeAttempts, now);
            }
        }

        private static void RecordFailure(ConcurrentDictionary<string, Attempts> map, string key, DateTime now)
        {
            if (!map.TryGetValue(key, out var attempts))
            {
                return;
            }

            lock (attempts)
            {
                if (now - attempts.LastFailure > ForgetAfter)
                {
                    attempts.Failures = 0;
                }

                attempts.InFlight = Math.Max(attempts.InFlight - 1, 0);
                attempts.Failures++;
                attempts.LastFailure = now;
            }
        }

        private static void Release(ConcurrentDictionary<string, Attempts> map, string key)
        {
            if (map.TryGetValue(key, out var attempts))
            {
                lock (attempts)
                {
                    attempts.InFlight = Math.Max(attempts.InFlight - 1, 0);
                }
            }
        }

        private static TimeSpan GetRetryDelay(Attempts attempts, int freeAttempts, DateTime now)
        {
            var failures = CurrentFailures(attempts, now);

            if (failures + attempts.InFlight < freeAttempts)
            {
                return TimeSpan.Zero;
            }

            // Past the free attempts only one check runs at a time
            if (attempts.InFlight > 0)
            {
                return GetDelay(failures + attempts.InFlight, freeAttempts);
            }

            var remaining = attempts.LastFailure + GetDelay(failures, freeAttempts) - now;

            return remaining > TimeSpan.Zero ? remaining : TimeSpan.Zero;
        }

        private static int CurrentFailures(Attempts attempts, DateTime now)
        {
            return now - attempts.LastFailure > ForgetAfter ? 0 : attempts.Failures;
        }

        private static TimeSpan GetDelay(int failures, int freeAttempts)
        {
            var exponent = Math.Clamp(failures - freeAttempts, 0, 10);
            var delay = TimeSpan.FromSeconds(Math.Pow(2, exponent));

            return delay < MaxDelay ? delay : MaxDelay;
        }

        private static TimeSpan Max(TimeSpan a, TimeSpan b)
        {
            return a > b ? a : b;
        }

        private static string GetKey(string clientAddress, string username)
        {
            return $"{clientAddress}|{username?.ToLowerInvariant()}";
        }

        private static Attempts GetOrAdd(ConcurrentDictionary<string, Attempts> map, string key, int freeAttempts, DateTime now)
        {
            if (map.TryGetValue(key, out var existing))
            {
                return existing;
            }

            if (map.Count >= MaxEntries)
            {
                MakeRoom(map, freeAttempts, now);
            }

            return map.GetOrAdd(key, _ => new Attempts());
        }

        // Keeps the map bounded without giving up the throttles that matter: forgotten entries and
        // ones below their limit go first, and an active throttle is only dropped when nothing else
        // is left, oldest first. Entries with a check in flight are never dropped.
        private static void MakeRoom(ConcurrentDictionary<string, Attempts> map, int freeAttempts, DateTime now)
        {
            var target = MaxEntries * 9 / 10;
            var excess = map.Count - target;

            if (excess <= 0)
            {
                return;
            }

            var victims = map.Where(e => e.Value.InFlight == 0)
                             .OrderBy(e => CurrentFailures(e.Value, now) >= freeAttempts ? 1 : 0)
                             .ThenBy(e => e.Value.LastFailure)
                             .Take(excess)
                             .Select(e => e.Key)
                             .ToList();

            foreach (var key in victims)
            {
                map.TryRemove(key, out _);
            }
        }

        private class Attempts
        {
            public int Failures { get; set; }
            public int InFlight { get; set; }
            public DateTime LastFailure { get; set; }
        }
    }
}
