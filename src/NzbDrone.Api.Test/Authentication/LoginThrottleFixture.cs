using System;
using FluentAssertions;
using NUnit.Framework;
using Readarr.Http.Authentication;

namespace NzbDrone.Api.Test.Authentication
{
    [TestFixture]
    public class LoginThrottleFixture
    {
        private const string Address = "203.0.113.5";

        private TestLoginThrottle _subject;

        [SetUp]
        public void Setup()
        {
            _subject = new TestLoginThrottle { Now = new DateTime(2026, 10, 8, 2, 0, 0, DateTimeKind.Utc) };
        }

        private void Fail(int times, string address = Address, string username = "sam")
        {
            for (var i = 0; i < times; i++)
            {
                _subject.TryBeginAttempt(address, username, out _).Should().BeTrue();
                _subject.EndAttempt(address, username, false);
            }
        }

        private bool Admitted(string address = Address, string username = "sam")
        {
            return _subject.TryBeginAttempt(address, username, out _);
        }

        [Test]
        public void should_allow_the_free_attempts()
        {
            Fail(LoginThrottle.FreeAttempts - 1);

            _subject.GetRetryDelay(Address, "sam").Should().Be(TimeSpan.Zero);
            Admitted().Should().BeTrue();
        }

        [Test]
        public void should_delay_after_the_free_attempts_and_double_each_failure()
        {
            Fail(LoginThrottle.FreeAttempts);
            _subject.GetRetryDelay(Address, "sam").Should().Be(TimeSpan.FromSeconds(1));
            Admitted().Should().BeFalse();

            _subject.Now += TimeSpan.FromSeconds(1);
            Fail(1);
            _subject.GetRetryDelay(Address, "sam").Should().Be(TimeSpan.FromSeconds(2));

            _subject.Now += TimeSpan.FromSeconds(2);
            Fail(1);
            _subject.GetRetryDelay(Address, "sam").Should().Be(TimeSpan.FromSeconds(4));
        }

        [Test]
        public void should_cap_the_delay()
        {
            for (var i = 0; i < 50; i++)
            {
                _subject.Now += LoginThrottle.MaxDelay;
                Fail(1);
            }

            _subject.GetRetryDelay(Address, "sam").Should().Be(LoginThrottle.MaxDelay);
        }

        [Test]
        public void should_allow_again_once_the_delay_has_passed()
        {
            Fail(LoginThrottle.FreeAttempts);

            _subject.Now += TimeSpan.FromSeconds(1);

            Admitted().Should().BeTrue();
        }

        [Test]
        public void checks_in_flight_should_not_refuse_anyone_without_failures()
        {
            for (var i = 0; i < LoginThrottle.FreeAttempts * 2; i++)
            {
                Admitted().Should().BeTrue();
            }
        }

        [Test]
        public void checks_in_flight_should_be_capped()
        {
            for (var i = 0; i < LoginThrottle.MaxConcurrentChecks; i++)
            {
                Admitted().Should().BeTrue();
            }

            Admitted().Should().BeFalse();
        }

        [Test]
        public void success_should_keep_other_reservations_on_the_same_key()
        {
            Admitted().Should().BeTrue();
            Admitted().Should().BeTrue();

            _subject.EndAttempt(Address, "sam", true);
            _subject.EndAttempt(Address, "sam", false);

            // The failure that finished after the success still counts
            Fail(LoginThrottle.FreeAttempts - 1);

            Admitted().Should().BeFalse();
        }

        [Test]
        public void full_map_of_active_bans_should_refuse_new_keys_and_keep_the_bans()
        {
            for (var i = 0; i < LoginThrottle.MaxEntries; i++)
            {
                Fail(LoginThrottle.FreeAttempts, $"198.51.{i / 250}.{i % 250}", "user" + i);
            }

            _subject.TryBeginAttempt("192.0.2.1", "newcomer", out _).Should().BeFalse();

            _subject.GetRetryDelay("198.51.0.0", "user0").Should().BeGreaterThan(TimeSpan.Zero);
        }

        [Test]
        public void should_admit_one_check_at_a_time_once_throttled()
        {
            Fail(LoginThrottle.FreeAttempts);
            _subject.Now += TimeSpan.FromSeconds(1);

            Admitted().Should().BeTrue();
            Admitted().Should().BeFalse();
        }

        [Test]
        public void abandoned_attempt_should_free_its_slot_without_counting()
        {
            Fail(LoginThrottle.FreeAttempts);
            _subject.Now += TimeSpan.FromSeconds(1);

            Admitted().Should().BeTrue();
            Admitted().Should().BeFalse();

            _subject.AbandonAttempt(Address, "sam");

            _subject.GetRetryDelay(Address, "sam").Should().Be(TimeSpan.Zero);
            Admitted().Should().BeTrue();
        }

        [Test]
        public void should_forget_failures_after_a_quiet_spell()
        {
            Fail(LoginThrottle.FreeAttempts);

            _subject.Now += LoginThrottle.ForgetAfter + TimeSpan.FromSeconds(1);

            _subject.GetRetryDelay(Address, "sam").Should().Be(TimeSpan.Zero);
            Fail(LoginThrottle.FreeAttempts - 1);
            Admitted().Should().BeTrue();
        }

        [Test]
        public void should_clear_on_success()
        {
            Fail(LoginThrottle.FreeAttempts - 1);

            Admitted().Should().BeTrue();
            _subject.EndAttempt(Address, "sam", true);

            Fail(LoginThrottle.FreeAttempts - 1);
            Admitted().Should().BeTrue();
        }

        [Test]
        public void should_not_affect_other_addresses_or_users()
        {
            Fail(LoginThrottle.FreeAttempts);

            Admitted("192.168.0.50").Should().BeTrue();
            Admitted(username: "someone").Should().BeTrue();
        }

        [Test]
        public void flooding_other_keys_should_not_clear_an_active_throttle()
        {
            Fail(LoginThrottle.FreeAttempts);

            for (var i = 0; i <= LoginThrottle.MaxEntries; i++)
            {
                // Distinct addresses, so a per-address limit can't be what stops the flood
                var address = $"198.51.{i / 250}.{i % 250}";

                _subject.TryBeginAttempt(address, "user" + i, out _);
                _subject.EndAttempt(address, "user" + i, false);
            }

            Admitted().Should().BeFalse();
        }

        [Test]
        public void one_address_trying_many_usernames_should_be_throttled()
        {
            for (var i = 0; i < LoginThrottle.SourceFreeAttempts; i++)
            {
                Fail(1, username: "user" + i);
            }

            Admitted(username: "fresh").Should().BeFalse();
            Admitted("192.168.0.50", "fresh").Should().BeTrue();
        }

        [Test]
        public void should_ignore_username_case()
        {
            Fail(LoginThrottle.FreeAttempts, username: "SAM");

            _subject.GetRetryDelay(Address, "sam").Should().BeGreaterThan(TimeSpan.Zero);
        }

        public class TestLoginThrottle : LoginThrottle
        {
            public DateTime Now { get; set; }

            protected override DateTime GetUtcNow()
            {
                return Now;
            }
        }
    }
}
