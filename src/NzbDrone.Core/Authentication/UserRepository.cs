using System;
using System.Linq;
using Dapper;
using NzbDrone.Core.Datastore;
using NzbDrone.Core.Messaging.Events;

namespace NzbDrone.Core.Authentication
{
    public interface IUserRepository : IBasicRepository<User>
    {
        User FindUser(string username);
        User FindUser(Guid identifier);
        bool UpdatePasswordHash(User user, string expectedPassword);
        void UpdateCredentials(User user, bool includePassword);
        void UpdateIdentifier(User user);
    }

    // Credential writes touch only the columns they mean to change. A full-row update from an
    // object read earlier could put back a password or Identifier another request just replaced.
    public class UserRepository : BasicRepository<User>, IUserRepository
    {
        public UserRepository(IMainDatabase database, IEventAggregator eventAggregator)
            : base(database, eventAggregator)
        {
        }

        public User FindUser(string username)
        {
            return Query(x => x.Username == username).SingleOrDefault();
        }

        public User FindUser(Guid identifier)
        {
            return Query(x => x.Identifier == identifier).SingleOrDefault();
        }

        // Writes the hash only while the stored one is still expectedPassword; false when it changed
        public bool UpdatePasswordHash(User user, string expectedPassword)
        {
            var sql = $"UPDATE \"{_table}\" SET \"Password\" = @Password, \"Salt\" = @Salt, \"Iterations\" = @Iterations " +
                      "WHERE \"Id\" = @Id AND \"Password\" = @ExpectedPassword";

            using (var conn = _database.OpenConnection())
            {
                return conn.Execute(sql, new { user.Password, user.Salt, user.Iterations, user.Id, ExpectedPassword = expectedPassword }) == 1;
            }
        }

        public void UpdateCredentials(User user, bool includePassword)
        {
            var sql = $"UPDATE \"{_table}\" SET \"Username\" = @Username, \"Identifier\" = @Identifier" +
                      (includePassword ? ", \"Password\" = @Password, \"Salt\" = @Salt, \"Iterations\" = @Iterations" : string.Empty) +
                      " WHERE \"Id\" = @Id";

            ExecuteSingleRow(sql, new { user.Username, user.Identifier, user.Password, user.Salt, user.Iterations, user.Id });
        }

        public void UpdateIdentifier(User user)
        {
            ExecuteSingleRow($"UPDATE \"{_table}\" SET \"Identifier\" = @Identifier WHERE \"Id\" = @Id", new { user.Identifier, user.Id });
        }

        private void ExecuteSingleRow(string sql, object parameters)
        {
            using (var conn = _database.OpenConnection())
            {
                if (conn.Execute(sql, parameters) != 1)
                {
                    throw new InvalidOperationException("User was not updated, it no longer exists");
                }
            }
        }
    }
}
