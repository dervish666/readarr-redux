using System;
using System.Collections.Generic;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Core.Authentication;
using NzbDrone.Core.Configuration;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.Authentication
{
    [TestFixture]
    public class ApiKeyResetServiceFixture : CoreTest<ApiKeyResetService>
    {
        [Test]
        public void should_revoke_sessions_before_changing_the_key()
        {
            var calls = new List<string>();

            Mocker.GetMock<IUserService>().Setup(s => s.RevokeSessions()).Callback(() => calls.Add("revoke"));
            Mocker.GetMock<IConfigFileProvider>().Setup(s => s.ResetApiKey()).Callback(() => calls.Add("reset"));

            Subject.Execute(new ResetApiKeyCommand());

            calls.Should().Equal("revoke", "reset");
        }

        [Test]
        public void should_keep_the_key_and_fail_when_sessions_cannot_be_revoked()
        {
            Mocker.GetMock<IUserService>().Setup(s => s.RevokeSessions()).Throws(new InvalidOperationException("database is locked"));

            Assert.Throws<InvalidOperationException>(() => Subject.Execute(new ResetApiKeyCommand()));

            Mocker.GetMock<IConfigFileProvider>().Verify(v => v.ResetApiKey(), Times.Never());
        }
    }
}
