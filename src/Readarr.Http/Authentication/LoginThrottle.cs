using System;
using System.Collections.Concurrent;
using System.Linq;

namespace Readarr.Http.Authentication
{
    public interface ILoginThrottle
    {
        TimeSpan GetRetryDelay(string clientAddress, string username);
        void RecordFailure(string clientAddress, string username);
        void RecordSuccess(string clientAddress, string username);
    }

    // Slows password guessing per client address and username. After a few free failures each
    // further failure doubles the wait before the next attempt is checked, up to a cap. Nothing
    // is permanent: a success or a quiet spell clears it, and other addresses are unaffected, so
    // a guesser can't lock the real user out.
    public class LoginThrottle : ILoginThrottle
    {
        public const int FreeAttempts = 5;
        public static readonly TimeSpan MaxDelay = TimeSpan.FromSeconds(30);
        public static readonly TimeSpan ForgetAfter = TimeSpan.FromMinutes(15);

        private const int MaxEntries = 10000;

        private readonly ConcurrentDictionary<string, Attempts> _attempts = new ConcurrentDictionary<string, Attempts>();

        public TimeSpan GetRetryDelay(string clientAddress, string username)
        {
            if (!_attempts.TryGetValue(GetKey(clientAddress, username), out var attempts))
            {
                return TimeSpan.Zero;
            }

            var now = GetUtcNow();

            lock (attempts)
            {
                if (attempts.Failures < FreeAttempts || now - attempts.LastFailure > ForgetAfter)
                {
                    return TimeSpan.Zero;
                }

                var remaining = attempts.LastFailure + GetDelay(attempts.Failures) - now;

                return remaining > TimeSpan.Zero ? remaining : TimeSpan.Zero;
            }
        }

        public void RecordFailure(string clientAddress, string username)
        {
            var now = GetUtcNow();

            if (_attempts.Count >= MaxEntries)
            {
                RemoveStale(now);
            }

            var attempts = _attempts.GetOrAdd(GetKey(clientAddress, username), _ => new Attempts());

            lock (attempts)
            {
                if (now - attempts.LastFailure > ForgetAfter)
                {
                    attempts.Failures = 0;
                }

                attempts.Failures++;
                attempts.LastFailure = now;
            }
        }

        public void RecordSuccess(string clientAddress, string username)
        {
            _attempts.TryRemove(GetKey(clientAddress, username), out _);
        }

        protected virtual DateTime GetUtcNow()
        {
            return DateTime.UtcNow;
        }

        private static TimeSpan GetDelay(int failures)
        {
            var exponent = Math.Min(failures - FreeAttempts, 10);
            var delay = TimeSpan.FromSeconds(Math.Pow(2, exponent));

            return delay < MaxDelay ? delay : MaxDelay;
        }

        private static string GetKey(string clientAddress, string username)
        {
            return $"{clientAddress}|{username?.ToLowerInvariant()}";
        }

        private void RemoveStale(DateTime now)
        {
            foreach (var key in _attempts.Where(a => now - a.Value.LastFailure > ForgetAfter).Select(a => a.Key).ToList())
            {
                _attempts.TryRemove(key, out _);
            }

            // Still full means a flood of distinct keys; drop the lot rather than grow without bound
            if (_attempts.Count >= MaxEntries)
            {
                _attempts.Clear();
            }
        }

        private class Attempts
        {
            public int Failures { get; set; }
            public DateTime LastFailure { get; set; }
        }
    }
}
