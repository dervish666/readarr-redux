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

        [Test]
        public void parallel_guesses_should_not_get_past_the_free_attempts()
        {
            var entered = 0;
            var gate = new ManualResetEventSlim(false);

            Mocker.GetMock<IUserService>()
                .Setup(s => s.FindUser("sam", It.Is<string>(p => p != "hunter2")))
                .Callback(() =>
                {
                    Interlocked.Increment(ref entered);
                    gate.Wait(TimeSpan.FromSeconds(10));
                })
                .Returns((User)null);

            var subject = Subject;
            var threads = Enumerable.Range(0, 20)
                .Select(i => new Thread(() => subject.Login(Request("203.0.113.5"), "sam", "wrong" + i)))
                .ToList();

            threads.ForEach(t => t.Start());

            // Give every thread time to reach the password check before any of them finishes
            Thread.Sleep(500);
            gate.Set();
            threads.ForEach(t => t.Join());

            entered.Should().BeLessOrEqualTo(LoginThrottle.FreeAttempts);
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
