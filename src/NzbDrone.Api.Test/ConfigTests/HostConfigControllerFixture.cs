using System;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Core.Authentication;
using NzbDrone.Test.Common;
using Readarr.Api.V1.Config;

namespace NzbDrone.Api.Test.ConfigTests
{
    [TestFixture]
    public class HostConfigControllerFixture : TestBase<HostConfigController>
    {
        private const string StoredHash = "c3RvcmVkIGhhc2g=";

        [SetUp]
        public void Setup()
        {
            Mocker.GetMock<IUserService>()
                .Setup(s => s.FindUser())
                .Returns(new User { Identifier = Guid.NewGuid(), Username = "sam", Password = StoredHash, Salt = "c2FsdA==", Iterations = 10000 });
        }

        [Test]
        public void get_should_not_return_stored_password_hash()
        {
            var resource = Subject.GetHostConfig();

            resource.Username.Should().Be("sam");
            resource.Password.Should().NotBe(StoredHash);
            resource.Password.Should().Be("********");
        }

        [Test]
        public void get_should_return_empty_password_without_user()
        {
            Mocker.GetMock<IUserService>()
                .Setup(s => s.FindUser())
                .Returns((User)null);

            Subject.GetHostConfig().Password.Should().BeEmpty();
        }

        [Test]
        public void saving_unchanged_password_should_keep_it()
        {
            var resource = Subject.GetHostConfig();
            resource.Username = "dervish";

            Subject.SaveHostConfig(resource);

            Mocker.GetMock<IUserService>()
                .Verify(v => v.Upsert("dervish", null), Times.Once());
        }

        [Test]
        public void saving_new_password_should_pass_it_on()
        {
            var resource = Subject.GetHostConfig();
            resource.Password = "hunter2";
            resource.PasswordConfirmation = "hunter2";

            Subject.SaveHostConfig(resource);

            Mocker.GetMock<IUserService>()
                .Verify(v => v.Upsert("sam", "hunter2"), Times.Once());
        }
    }
}
