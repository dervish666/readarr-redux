using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Sockets;

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
    // doubles the wait before the next attempt is checked, up to a cap, and only one check runs at
    // a time. Below that, checks in flight don't count, so concurrent good requests (Basic auth
    // sends credentials with each one) aren't refused; a fixed cap on checks in flight bounds the
    // burst that can arrive before the first failure is recorded. Nothing is permanent: a success
    // or a quiet spell clears it, and other addresses are unaffected.
    //
    // All state sits behind one lock, so admission, recording and eviction can't interleave.
    public class LoginThrottle : ILoginThrottle
    {
        public const int FreeAttempts = 5;
        public const int SourceFreeAttempts = 20;
        public const int MaxEntries = 10000;
        public const int MaxConcurrentChecks = 32;
        public static readonly TimeSpan MaxDelay = TimeSpan.FromSeconds(30);
        public static readonly TimeSpan ForgetAfter = TimeSpan.FromMinutes(15);

        private static readonly TimeSpan BusyDelay = TimeSpan.FromSeconds(1);

        private readonly object _sync = new object();
        private readonly Dictionary<string, Attempts> _byUser = new Dictionary<string, Attempts>();
        private readonly Dictionary<string, Attempts> _bySource = new Dictionary<string, Attempts>();

        public TimeSpan GetRetryDelay(string clientAddress, string username)
        {
            var now = GetUtcNow();

            lock (_sync)
            {
                return Max(GetRetryDelay(Find(_byUser, GetKey(clientAddress, username)), FreeAttempts, now),
                           GetRetryDelay(Find(_bySource, GetSourceKey(clientAddress)), SourceFreeAttempts, now));
            }
        }

        public bool TryBeginAttempt(string clientAddress, string username, out TimeSpan retryDelay)
        {
            var now = GetUtcNow();
            var userKey = GetKey(clientAddress, username);
            var sourceKey = GetSourceKey(clientAddress);

            lock (_sync)
            {
                var user = Find(_byUser, userKey);
                var source = Find(_bySource, sourceKey);

                retryDelay = Max(GetRetryDelay(user, FreeAttempts, now), GetRetryDelay(source, SourceFreeAttempts, now));

                if (retryDelay > TimeSpan.Zero)
                {
                    return false;
                }

                // No room without dropping an active ban or a check in flight: refuse rather than forget
                if ((user == null && !TryAdd(_byUser, userKey, FreeAttempts, now, out user)) ||
                    (source == null && !TryAdd(_bySource, sourceKey, SourceFreeAttempts, now, out source)))
                {
                    retryDelay = MaxDelay;

                    return false;
                }

                user.InFlight++;
                source.InFlight++;

                return true;
            }
        }

        public void EndAttempt(string clientAddress, string username, bool succeeded)
        {
            var now = GetUtcNow();

            lock (_sync)
            {
                End(_byUser, GetKey(clientAddress, username), succeeded, now);
                End(_bySource, GetSourceKey(clientAddress), succeeded, now);
            }
        }

        // The check never finished (an error, not a wrong password), so release the slot uncounted
        public void AbandonAttempt(string clientAddress, string username)
        {
            lock (_sync)
            {
                Release(_byUser, GetKey(clientAddress, username));
                Release(_bySource, GetSourceKey(clientAddress));
            }
        }

        protected virtual DateTime GetUtcNow()
        {
            return DateTime.UtcNow;
        }

        private static void End(Dictionary<string, Attempts> map, string key, bool succeeded, DateTime now)
        {
            if (!map.TryGetValue(key, out var attempts))
            {
                return;
            }

            attempts.InFlight = Math.Max(attempts.InFlight - 1, 0);

            if (succeeded)
            {
                // Other checks on this key may still be running; their outcomes still need a home
                attempts.Failures = 0;

                if (attempts.InFlight == 0)
                {
                    map.Remove(key);
                }

                return;
            }

            if (now - attempts.LastFailure > ForgetAfter)
            {
                attempts.Failures = 0;
            }

            attempts.Failures++;
            attempts.LastFailure = now;
        }

        private static void Release(Dictionary<string, Attempts> map, string key)
        {
            if (map.TryGetValue(key, out var attempts))
            {
                attempts.InFlight = Math.Max(attempts.InFlight - 1, 0);

                if (attempts.InFlight == 0 && attempts.Failures == 0)
                {
                    map.Remove(key);
                }
            }
        }

        private static TimeSpan GetRetryDelay(Attempts attempts, int freeAttempts, DateTime now)
        {
            if (attempts == null)
            {
                return TimeSpan.Zero;
            }

            if (attempts.InFlight >= MaxConcurrentChecks)
            {
                return BusyDelay;
            }

            var failures = CurrentFailures(attempts, now);

            if (failures < freeAttempts)
            {
                return TimeSpan.Zero;
            }

            // Past the free attempts only one check runs at a time, and only after the wait
            if (attempts.InFlight > 0)
            {
                return GetDelay(failures, freeAttempts);
            }

            var remaining = attempts.LastFailure + GetDelay(failures, freeAttempts) - now;

            return remaining > TimeSpan.Zero ? remaining : TimeSpan.Zero;
        }

        private static bool IsBanned(Attempts attempts, int freeAttempts, DateTime now)
        {
            return CurrentFailures(attempts, now) >= freeAttempts;
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
            return $"{GetSourceKey(clientAddress)}|{username?.ToLowerInvariant()}";
        }

        // One IPv6 client usually holds a whole /64, so count it as one source; otherwise rotating through its
        // addresses would give it unthrottled guesses and fill the map
        private static string GetSourceKey(string clientAddress)
        {
            if (clientAddress != null &&
                IPAddress.TryParse(clientAddress, out var address) &&
                address.AddressFamily == AddressFamily.InterNetworkV6 &&
                !address.IsIPv4MappedToIPv6)
            {
                var bytes = address.GetAddressBytes();
                Array.Clear(bytes, 8, 8);

                return new IPAddress(bytes) + "/64";
            }

            return clientAddress ?? string.Empty;
        }

        private static Attempts Find(Dictionary<string, Attempts> map, string key)
        {
            return map.TryGetValue(key, out var attempts) ? attempts : null;
        }

        // Keeps the map bounded. Entries with no check in flight and no active ban go first, oldest first. If that isn't
        // enough, the oldest bans go too: refusing new keys instead would let anyone holding enough addresses lock every
        // other client out of logging in.
        private static bool TryAdd(Dictionary<string, Attempts> map, string key, int freeAttempts, DateTime now, out Attempts attempts)
        {
            if (map.Count >= MaxEntries)
            {
                var excess = map.Count - (MaxEntries * 9 / 10);

                var victims = map.Where(e => e.Value.InFlight == 0)
                                 .OrderBy(e => IsBanned(e.Value, freeAttempts, now))
                                 .ThenBy(e => e.Value.LastFailure)
                                 .Take(excess)
                                 .Select(e => e.Key)
                                 .ToList();

                foreach (var victim in victims)
                {
                    map.Remove(victim);
                }
            }

            if (map.Count >= MaxEntries)
            {
                attempts = null;

                return false;
            }

            attempts = new Attempts();
            map[key] = attempts;

            return true;
        }

        private class Attempts
        {
            public int Failures { get; set; }
            public int InFlight { get; set; }
            public DateTime LastFailure { get; set; }
        }
    }
}
