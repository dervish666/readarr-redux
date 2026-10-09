using System;
using System.Threading;

namespace NzbDrone.Core.MetadataSource
{
    // Caps how long one command may spend waiting out a rate-limited or failing metadata source, across every request
    // it makes. Per-request caps alone let a 300-author refresh at Retry-After 60 sleep for 20 hours. The budget
    // follows the command's own flow; outside a scope only the per-request caps apply.
    public static class MetadataRetryBudget
    {
        private static readonly AsyncLocal<Budget> Current = new AsyncLocal<Budget>();

        public static bool Exhausted => Current.Value?.Exhausted ?? false;

        public static IDisposable Start(TimeSpan total)
        {
            var scope = new Scope(Current.Value);
            Current.Value = new Budget { Remaining = total };
            return scope;
        }

        // False, and the budget counts as spent, when waiting this long would overrun it
        public static bool TrySpend(TimeSpan delay)
        {
            var budget = Current.Value;

            if (budget == null)
            {
                return true;
            }

            if (budget.Exhausted || delay > budget.Remaining)
            {
                budget.Exhausted = true;
                return false;
            }

            budget.Remaining -= delay;
            return true;
        }

        private sealed class Budget
        {
            public TimeSpan Remaining { get; set; }
            public bool Exhausted { get; set; }
        }

        private sealed class Scope : IDisposable
        {
            private readonly Budget _previous;

            public Scope(Budget previous)
            {
                _previous = previous;
            }

            public void Dispose()
            {
                Current.Value = _previous;
            }
        }
    }
}
