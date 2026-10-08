using System;
using System.Collections.Generic;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.Authentication;
using NzbDrone.Core.Datastore;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.Datastore
{
    // GetSqlLogString feeds both the SQL trace log and the "SQL" data attached to failed queries
    [TestFixture]
    public class SqlLogStringFixture : CoreTest
    {
        private static User GivenUser()
        {
            return new User
            {
                Identifier = Guid.NewGuid(),
                Username = "sam",
                Password = "c2VjcmV0SGFzaFZhbHVl",
                Salt = "c2VjcmV0U2FsdA==",
                Iterations = 210000
            };
        }

        [Test]
        public void should_not_log_password_hash_salt_or_iterations()
        {
            var log = SqlBuilderExtensions.GetSqlLogString("UPDATE \"Users\" SET ...", GivenUser());

            log.Should().NotContain("c2VjcmV0SGFzaFZhbHVl");
            log.Should().NotContain("c2VjcmV0U2FsdA==");
            log.Should().NotContain("210000");
            log.Should().Contain("Password = [(removed)]");
            log.Should().Contain("sam");
        }

        [Test]
        public void should_not_log_password_hash_for_a_batch()
        {
            var log = SqlBuilderExtensions.GetSqlLogString("UPDATE \"Users\" SET ...", new List<User> { GivenUser() });

            log.Should().NotContain("c2VjcmV0SGFzaFZhbHVl");
            log.Should().NotContain("c2VjcmV0U2FsdA==");
        }
    }
}
