using System;
using System.Linq;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.Datastore.Migration;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.Datastore.Migration
{
    [TestFixture]
    public class add_salt_to_usersFixture : MigrationTest<add_salt_to_users>
    {
        [Test]
        public void should_keep_existing_user_with_empty_salt()
        {
            var identifier = Guid.NewGuid().ToString();
            var password = "hunter2".SHA256Hash();

            var db = WithMigrationTestDb(c =>
            {
                c.Insert.IntoTable("Users").Row(new
                {
                    Identifier = identifier,
                    Username = "sam",
                    Password = password
                });
            });

            var users = db.Query<User41>("SELECT * FROM \"Users\"");

            users.Should().HaveCount(1);
            users.First().Identifier.Should().Be(identifier);
            users.First().Username.Should().Be("sam");
            users.First().Password.Should().Be(password);
            users.First().Salt.Should().BeNull();
            users.First().Iterations.Should().BeNull();
        }
    }

    public class User41
    {
        public int Id { get; set; }
        public string Identifier { get; set; }
        public string Username { get; set; }
        public string Password { get; set; }
        public string Salt { get; set; }
        public int? Iterations { get; set; }
    }
}
