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
                _subject.RecordFailure(address, username);
            }
        }

        [Test]
        public void should_allow_the_free_attempts()
        {
            Fail(LoginThrottle.FreeAttempts - 1);

            _subject.GetRetryDelay(Address, "sam").Should().Be(TimeSpan.Zero);
        }

        [Test]
        public void should_delay_after_the_free_attempts_and_double_each_failure()
        {
            Fail(LoginThrottle.FreeAttempts);
            _subject.GetRetryDelay(Address, "sam").Should().Be(TimeSpan.FromSeconds(1));

            Fail(1);
            _subject.GetRetryDelay(Address, "sam").Should().Be(TimeSpan.FromSeconds(2));

            Fail(1);
            _subject.GetRetryDelay(Address, "sam").Should().Be(TimeSpan.FromSeconds(4));
        }

        [Test]
        public void should_cap_the_delay()
        {
            Fail(LoginThrottle.FreeAttempts + 50);

            _subject.GetRetryDelay(Address, "sam").Should().Be(LoginThrottle.MaxDelay);
        }

        [Test]
        public void should_allow_again_once_the_delay_has_passed()
        {
            Fail(LoginThrottle.FreeAttempts + 50);

            _subject.Now += LoginThrottle.MaxDelay;

            _subject.GetRetryDelay(Address, "sam").Should().Be(TimeSpan.Zero);
        }

        [Test]
        public void should_forget_failures_after_a_quiet_spell()
        {
            Fail(LoginThrottle.FreeAttempts + 3);

            _subject.Now += LoginThrottle.ForgetAfter + TimeSpan.FromSeconds(1);
            Fail(1);

            _subject.GetRetryDelay(Address, "sam").Should().Be(TimeSpan.Zero);
        }

        [Test]
        public void should_clear_on_success()
        {
            Fail(LoginThrottle.FreeAttempts + 3);

            _subject.RecordSuccess(Address, "sam");

            _subject.GetRetryDelay(Address, "sam").Should().Be(TimeSpan.Zero);
        }

        [Test]
        public void should_not_affect_other_addresses_or_users()
        {
            Fail(LoginThrottle.FreeAttempts + 3);

            _subject.GetRetryDelay("192.168.0.50", "sam").Should().Be(TimeSpan.Zero);
            _subject.GetRetryDelay(Address, "someone").Should().Be(TimeSpan.Zero);
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
