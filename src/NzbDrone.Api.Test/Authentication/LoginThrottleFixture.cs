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
        public void should_count_attempts_still_in_flight()
        {
            for (var i = 0; i < LoginThrottle.FreeAttempts; i++)
            {
                Admitted().Should().BeTrue();
            }

            Admitted().Should().BeFalse();
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
            for (var i = 0; i < LoginThrottle.FreeAttempts; i++)
            {
                Admitted().Should().BeTrue();
            }

            _subject.AbandonAttempt(Address, "sam");

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
