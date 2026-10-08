using System;
using System.Linq;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.Authentication;
using NzbDrone.Core.Datastore;
using NzbDrone.Core.Messaging.Events;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.Authentication
{
    // Each test lets a second writer change the Users row between the service's read and its
    // write, the interleaving two requests (login, settings save, API key reset) can produce
    [TestFixture]
    public class UserServiceRaceFixture : DbTest<UserService, User>
    {
        private InterleavingUserRepository _repo;
        private UserRepository _otherWriter;

        [SetUp]
        public void Setup()
        {
            _repo = Mocker.Resolve<InterleavingUserRepository>();
            _otherWriter = Mocker.Resolve<UserRepository>();

            Mocker.SetConstant<IUserRepository>(_repo);
        }

        private User StoredUser()
        {
            return Db.All<User>().Single();
        }

        private void GivenLegacyUser(string password)
        {
            Db.Insert(new User
            {
                Identifier = Guid.NewGuid(),
                Username = "sam",
                Password = password.SHA256Hash()
            });
        }

        private void OnNextRead(Action<User> change)
        {
            _repo.OnRead = () =>
            {
                var fresh = _otherWriter.SingleOrDefault();
                change(fresh);
                _otherWriter.Update(fresh);
            };
        }

        [Test]
        public void legacy_upgrade_should_not_undo_a_concurrent_password_change()
        {
            GivenLegacyUser("hunter2");
            var changedIdentifier = Guid.NewGuid();

            OnNextRead(u =>
            {
                u.Password = "changed".SHA256Hash();
                u.Identifier = changedIdentifier;
            });

            Subject.FindUser("sam", "hunter2");

            var stored = StoredUser();
            stored.Password.Should().Be("changed".SHA256Hash());
            stored.Identifier.Should().Be(changedIdentifier);
        }

        [Test]
        public void legacy_upgrade_should_not_restore_a_revoked_identifier()
        {
            GivenLegacyUser("hunter2");
            var revokedTo = Guid.NewGuid();

            OnNextRead(u => u.Identifier = revokedTo);

            Subject.FindUser("sam", "hunter2").Should().NotBeNull();

            var stored = StoredUser();
            stored.Identifier.Should().Be(revokedTo);
            stored.Salt.Should().NotBeNullOrWhiteSpace();
        }

        [Test]
        public void unchanged_save_should_not_restore_a_revoked_identifier()
        {
            Subject.Add("sam", "hunter2");
            var revokedTo = Guid.NewGuid();

            OnNextRead(u => u.Identifier = revokedTo);

            Subject.Upsert("sam", null);

            StoredUser().Identifier.Should().Be(revokedTo);
        }

        [Test]
        public void work_factor_rehash_should_not_undo_a_concurrent_password_change()
        {
            // PBKDF2-HMAC-SHA512 of "password" with salt "salt" and 1 iteration (first 32 bytes)
            Db.Insert(new User
            {
                Identifier = Guid.NewGuid(),
                Username = "sam",
                Salt = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes("salt")),
                Iterations = 1,
                Password = Convert.ToBase64String(Convert.FromHexString("867f70cf1ade02cff3752599a3a53dc4af34c7a669815ae5d513554e1c8cf252"))
            });

            OnNextRead(u =>
            {
                u.Password = "changed".SHA256Hash();
                u.Salt = null;
            });

            Subject.FindUser("sam", "password");

            StoredUser().Password.Should().Be("changed".SHA256Hash());
        }

        [Test]
        public void login_should_succeed_when_the_hash_upgrade_cannot_be_written()
        {
            GivenLegacyUser("hunter2");
            _repo.HashUpdateFailure = new InvalidOperationException("attempt to write a readonly database");

            Subject.FindUser("sam", "hunter2").Should().NotBeNull();
            Subject.FindUser("sam", "wrong").Should().BeNull();

            var stored = StoredUser();
            stored.Password.Should().Be("hunter2".SHA256Hash());
            stored.Salt.Should().BeNull();
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void revoke_should_fail_loudly_when_the_identifier_is_not_stored()
        {
            Subject.Add("sam", "hunter2");

            _repo.OnRead = () => _otherWriter.Delete(_otherWriter.SingleOrDefault());

            Assert.Throws<InvalidOperationException>(() => Subject.RevokeSessions());
        }

        [Test]
        public void username_change_should_not_restore_a_concurrently_changed_password()
        {
            Subject.Add("sam", "hunter2");
            var otherHash = StoredUser().Password;

            OnNextRead(u =>
            {
                u.Password = "changed".SHA256Hash();
                u.Salt = null;
            });

            Subject.Upsert("dervish", null);

            var stored = StoredUser();
            stored.Username.Should().Be("dervish");
            stored.Password.Should().Be("changed".SHA256Hash());
            stored.Password.Should().NotBe(otherHash);
        }
    }

    // Re-implements the interface so its reads run a hook before returning, letting a test write
    // to the row in between the service's read and its write
    public class InterleavingUserRepository : UserRepository, IUserRepository, IBasicRepository<User>
    {
        public InterleavingUserRepository(IMainDatabase database, IEventAggregator eventAggregator)
            : base(database, eventAggregator)
        {
        }

        public Action OnRead { get; set; }
        public Exception HashUpdateFailure { get; set; }

        public new bool UpdatePasswordHash(User user, string expectedPassword)
        {
            if (HashUpdateFailure != null)
            {
                throw HashUpdateFailure;
            }

            return base.UpdatePasswordHash(user, expectedPassword);
        }

        public new User SingleOrDefault()
        {
            var user = base.SingleOrDefault();
            RunHook();
            return user;
        }

        public new User FindUser(string username)
        {
            var user = base.FindUser(username);
            RunHook();
            return user;
        }

        private void RunHook()
        {
            var hook = OnRead;
            OnRead = null;
            hook?.Invoke();
        }
    }
}
