using System;
using System.Linq;
using System.Net;
using System.Threading;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Moq;
using NUnit.Framework;
using NzbDrone.Core.Authentication;
using NzbDrone.Core.Configuration;
using NzbDrone.Test.Common;
using Readarr.Http.Authentication;

namespace NzbDrone.Api.Test.Authentication
{
    [TestFixture]
    public class AuthenticationServiceFixture : TestBase<AuthenticationService>
    {
        private User _user;

        [SetUp]
        public void Setup()
        {
            _user = new User { Identifier = Guid.NewGuid(), Username = "sam" };

            Mocker.SetConstant<ILoginThrottle>(new LoginThrottle());

            Mocker.GetMock<IConfigFileProvider>()
                .SetupGet(s => s.AuthenticationMethod)
                .Returns(AuthenticationType.Forms);

            Mocker.GetMock<IUserService>()
                .Setup(s => s.FindUser("sam", "hunter2"))
                .Returns(_user);
        }

        [TearDown]
        public void TearDown()
        {
            // Every failure logs an Auth warning; the count isn't what these tests are about
            ExceptionVerification.IgnoreWarns();
        }

        private static HttpRequest Request(string address)
        {
            var httpContext = new DefaultHttpContext();
            httpContext.Connection.RemoteIpAddress = IPAddress.Parse(address);

            return httpContext.Request;
        }

        private void FailLogins(string address, int times)
        {
            for (var i = 0; i < times; i++)
            {
                Subject.Login(Request(address), "sam", "wrong" + i).Should().BeNull();
            }
        }

        [Test]
        public void should_stop_checking_passwords_after_repeated_failures()
        {
            FailLogins("203.0.113.5", LoginThrottle.FreeAttempts);

            Subject.Login(Request("203.0.113.5"), "sam", "hunter2").Should().BeNull();

            Mocker.GetMock<IUserService>()
                .Verify(v => v.FindUser(It.IsAny<string>(), It.IsAny<string>()), Times.Exactly(LoginThrottle.FreeAttempts));
        }

        // Runs the logins on their own threads while every password check blocks, so they overlap
        private (int Entered, int Succeeded) RunParallel(int count, string password)
        {
            var entered = 0;
            var succeeded = 0;
            var gate = new ManualResetEventSlim(false);

            Mocker.GetMock<IUserService>()
                .Setup(s => s.FindUser("sam", It.IsAny<string>()))
                .Callback(() =>
                {
                    Interlocked.Increment(ref entered);
                    gate.Wait(TimeSpan.FromSeconds(10));
                })
                .Returns<string, string>((u, p) => p == "hunter2" ? _user : null);

            var subject = Subject;
            var threads = Enumerable.Range(0, count)
                .Select(i => new Thread(() =>
                {
                    if (subject.Login(Request("203.0.113.5"), "sam", password ?? "wrong" + i) != null)
                    {
                        Interlocked.Increment(ref succeeded);
                    }
                }))
                .ToList();

            threads.ForEach(t => t.Start());

            // Give every thread time to reach the password check before any of them finishes
            Thread.Sleep(500);
            gate.Set();
            threads.ForEach(t => t.Join());

            return (entered, succeeded);
        }

        [Test]
        public void concurrent_valid_logins_should_all_succeed()
        {
            RunParallel(20, "hunter2").Succeeded.Should().Be(20);
        }

        [Test]
        public void parallel_guesses_before_any_failure_should_be_capped()
        {
            RunParallel(LoginThrottle.MaxConcurrentChecks + 10, null).Entered.Should().BeLessOrEqualTo(LoginThrottle.MaxConcurrentChecks);
        }

        [Test]
        public void parallel_guesses_once_throttled_should_be_checked_one_at_a_time()
        {
            FailLogins("203.0.113.5", LoginThrottle.FreeAttempts);
            Thread.Sleep(TimeSpan.FromSeconds(1.2));

            RunParallel(20, null).Entered.Should().Be(1);
        }

        [Test]
        public void should_still_let_another_address_log_in()
        {
            FailLogins("203.0.113.5", LoginThrottle.FreeAttempts);

            Subject.Login(Request("192.168.0.50"), "sam", "hunter2").Should().Be(_user);
        }

        [Test]
        public void should_reset_after_a_successful_login()
        {
            FailLogins("203.0.113.5", LoginThrottle.FreeAttempts - 1);

            Subject.Login(Request("203.0.113.5"), "sam", "hunter2").Should().Be(_user);

            FailLogins("203.0.113.5", LoginThrottle.FreeAttempts - 1);

            Subject.Login(Request("203.0.113.5"), "sam", "hunter2").Should().Be(_user);
        }
    }
}
