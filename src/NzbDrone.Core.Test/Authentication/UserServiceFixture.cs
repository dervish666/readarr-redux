using System;
using System.Linq;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.Authentication;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.Authentication
{
    [TestFixture]
    public class UserServiceFixture : DbTest<UserService, User>
    {
        [SetUp]
        public void Setup()
        {
            Mocker.SetConstant<IUserRepository>(Mocker.Resolve<UserRepository>());
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

        [Test]
        public void add_should_store_salted_pbkdf2_hash()
        {
            Subject.Add("Sam", "hunter2");

            var user = StoredUser();

            user.Username.Should().Be("sam");
            user.Salt.Should().NotBeNullOrWhiteSpace();
            user.Iterations.Should().Be(220000);
            user.Password.Should().NotBe("hunter2".SHA256Hash());
            Convert.FromBase64String(user.Password).Should().HaveCount(32);
        }

        [Test]
        public void same_password_should_hash_differently_each_time()
        {
            Subject.Add("sam", "hunter2");
            var first = StoredUser().Password;

            Subject.Upsert("sam", "something else");
            Subject.Upsert("sam", "hunter2");

            StoredUser().Password.Should().NotBe(first);
        }

        [Test]
        public void should_log_in_with_correct_password_only()
        {
            Subject.Add("sam", "hunter2");

            Subject.FindUser("SAM", "hunter2").Should().NotBeNull();
            Subject.FindUser("sam", "hunter3").Should().BeNull();
        }

        [Test]
        public void legacy_sha256_user_should_log_in_and_be_upgraded()
        {
            GivenLegacyUser("hunter2");

            Subject.FindUser("sam", "hunter2").Should().NotBeNull();

            var user = StoredUser();
            user.Salt.Should().NotBeNullOrWhiteSpace();
            user.Iterations.Should().Be(220000);
            user.Password.Should().NotBe("hunter2".SHA256Hash());

            Subject.FindUser("sam", "hunter2").Should().NotBeNull();
        }

        [Test]
        public void legacy_sha256_user_with_wrong_password_should_not_log_in_or_be_upgraded()
        {
            GivenLegacyUser("hunter2");

            Subject.FindUser("sam", "hunter3").Should().BeNull();

            var user = StoredUser();
            user.Salt.Should().BeNull();
            user.Password.Should().Be("hunter2".SHA256Hash());
        }

        [Test]
        public void should_verify_standard_pbkdf2_hmac_sha512_hash()
        {
            // RFC 6070 style vector for PBKDF2-HMAC-SHA512 ("password", "salt", 1 iteration), first 32 bytes.
            // Matches Sonarr's KeyDerivation.Pbkdf2, so a database moved between them still verifies.
            Db.Insert(new User
            {
                Identifier = Guid.NewGuid(),
                Username = "sam",
                Salt = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes("salt")),
                Iterations = 1,
                Password = Convert.ToBase64String(Convert.FromHexString("867f70cf1ade02cff3752599a3a53dc4af34c7a669815ae5d513554e1c8cf252"))
            });

            Subject.FindUser("sam", "password").Should().NotBeNull();
        }

        [Test]
        public void salted_hash_with_old_work_factor_should_be_rehashed_on_login()
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

            Subject.FindUser("sam", "password").Should().NotBeNull();

            var user = StoredUser();
            user.Iterations.Should().Be(220000);
            user.Salt.Should().NotBe(Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes("salt")));

            Subject.FindUser("sam", "password").Should().NotBeNull();
            Subject.FindUser("sam", "wrong").Should().BeNull();
        }

        [Test]
        public void wrong_password_should_not_rehash_old_work_factor()
        {
            Db.Insert(new User
            {
                Identifier = Guid.NewGuid(),
                Username = "sam",
                Salt = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes("salt")),
                Iterations = 1,
                Password = Convert.ToBase64String(Convert.FromHexString("867f70cf1ade02cff3752599a3a53dc4af34c7a669815ae5d513554e1c8cf252"))
            });

            Subject.FindUser("sam", "wrong").Should().BeNull();

            StoredUser().Iterations.Should().Be(1);
        }

        [Test]
        public void upsert_without_password_should_keep_password_and_change_username()
        {
            Subject.Add("sam", "hunter2");
            var before = StoredUser();

            Subject.Upsert("dervish", null);

            var after = StoredUser();
            after.Username.Should().Be("dervish");
            after.Password.Should().Be(before.Password);
            after.Salt.Should().Be(before.Salt);
            Subject.FindUser("dervish", "hunter2").Should().NotBeNull();
        }

        [Test]
        public void changing_password_should_sign_out_existing_sessions()
        {
            Subject.Add("sam", "hunter2");
            var before = StoredUser().Identifier;

            Subject.Upsert("sam", "hunter3");

            StoredUser().Identifier.Should().NotBe(before);
        }

        [Test]
        public void changing_username_should_sign_out_existing_sessions()
        {
            Subject.Add("sam", "hunter2");
            var before = StoredUser().Identifier;

            Subject.Upsert("dervish", null);

            StoredUser().Identifier.Should().NotBe(before);
        }

        [Test]
        public void saving_unchanged_credentials_should_keep_sessions()
        {
            Subject.Add("sam", "hunter2");
            var before = StoredUser().Identifier;

            Subject.Upsert("Sam", null);

            StoredUser().Identifier.Should().Be(before);
        }

        [Test]
        public void upgrading_legacy_hash_on_login_should_keep_sessions()
        {
            GivenLegacyUser("hunter2");
            var before = StoredUser().Identifier;

            Subject.FindUser("sam", "hunter2");

            StoredUser().Identifier.Should().Be(before);
        }

        [Test]
        public void revoke_sessions_should_sign_out_existing_sessions()
        {
            Subject.Add("sam", "hunter2");
            var before = StoredUser().Identifier;

            Subject.RevokeSessions();

            StoredUser().Identifier.Should().NotBe(before);
            Subject.FindUser("sam", "hunter2").Should().NotBeNull();
        }

        [Test]
        public void upsert_without_password_should_not_create_user()
        {
            Subject.Upsert("sam", null).Should().BeNull();

            Db.All<User>().Should().BeEmpty();
        }
    }
}
