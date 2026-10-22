using System;
using System.Security.Cryptography;
using System.Text;
using NLog;
using NzbDrone.Common.Disk;
using NzbDrone.Common.EnvironmentInfo;
using NzbDrone.Common.Extensions;

namespace NzbDrone.Core.Authentication
{
    public interface IUserService
    {
        User Add(string username, string password);
        User Update(User user);
        User Upsert(string username, string password);
        User FindUser();
        User FindUser(string username, string password);
        User FindUser(Guid identifier);
        void RevokeSessions();
    }

    public class UserService : IUserService
    {
        // OWASP's current figure for PBKDF2-HMAC-SHA512 (Sonarr still uses 10,000)
        private const int ITERATIONS = 220000;

        private const int SALT_SIZE = 128 / 8;
        private const int NUMBER_OF_BYTES = 256 / 8;

        private static readonly byte[] DummySalt = RandomNumberGenerator.GetBytes(SALT_SIZE);

        private readonly IUserRepository _repo;
        private readonly IAppFolderInfo _appFolderInfo;
        private readonly IDiskProvider _diskProvider;
        private readonly Logger _logger;

        public UserService(IUserRepository repo, IAppFolderInfo appFolderInfo, IDiskProvider diskProvider, Logger logger)
        {
            _repo = repo;
            _appFolderInfo = appFolderInfo;
            _diskProvider = diskProvider;
            _logger = logger;
        }

        public User Add(string username, string password)
        {
            var user = new User
            {
                Identifier = Guid.NewGuid(),
                Username = username.ToLowerInvariant()
            };

            SetUserHashedPassword(user, password);

            return _repo.Insert(user);
        }

        public User Update(User user)
        {
            return _repo.Update(user);
        }

        // A null password keeps the current one, so the username can change on its own
        public User Upsert(string username, string password)
        {
            var user = FindUser();

            if (user == null)
            {
                return password == null ? null : Add(username, password);
            }

            var newUsername = username.ToLowerInvariant();
            var passwordChanged = password != null && user.Password != password;

            if (newUsername == user.Username && !passwordChanged)
            {
                // Nothing to save. Writing the row back could undo a revocation made since the read.
                return user;
            }

            user.Username = newUsername;

            if (passwordChanged)
            {
                SetUserHashedPassword(user, password);
            }

            // Login cookies carry the Identifier and are checked against it on each request, so
            // a new one signs out every existing session
            user.Identifier = Guid.NewGuid();
            _repo.UpdateCredentials(user, passwordChanged);

            _logger.Info("Signed out existing sessions, credentials changed");

            return user;
        }

        // Throws if the new Identifier can't be stored, so callers can stop rather than carry on
        // with the old sessions still valid
        public void RevokeSessions()
        {
            var user = FindUser();

            if (user == null)
            {
                return;
            }

            user.Identifier = Guid.NewGuid();
            _repo.UpdateIdentifier(user);

            _logger.Info("Signed out existing sessions");
        }

        public User FindUser()
        {
            return _repo.SingleOrDefault();
        }

        public User FindUser(string username, string password)
        {
            if (username.IsNullOrWhiteSpace() || password.IsNullOrWhiteSpace())
            {
                return null;
            }

            // A rehash only lands if the stored hash is unchanged since the read; if another request
            // changed it in between, check again against what is stored now
            for (var attempt = 0; attempt < 2; attempt++)
            {
                var user = _repo.FindUser(username.ToLowerInvariant());

                if (user == null)
                {
                    // Spend the same time as a real check, so the response time doesn't tell a wrong username from a wrong password
                    GetHashedPassword(password, DummySalt, ITERATIONS);
                    return null;
                }

                var salted = !user.Salt.IsNullOrWhiteSpace();
                var verified = salted ? VerifyHashedPassword(user, password) : user.Password == password.SHA256Hash();

                if (!verified)
                {
                    return null;
                }

                if (salted && user.Iterations >= ITERATIONS)
                {
                    return user;
                }

                // Legacy unsalted SHA-256, or a salted hash below today's work factor: rehash it
                var (storedPassword, storedSalt, storedIterations) = (user.Password, user.Salt, user.Iterations);
                SetUserHashedPassword(user, password);

                try
                {
                    if (_repo.UpdatePasswordHash(user, storedPassword))
                    {
                        return user;
                    }
                }
                catch (Exception ex)
                {
                    // The password was right; the upgrade is opportunistic and is tried again next login
                    _logger.Warn(ex, "Could not store the upgraded password hash, keeping the old one for now");

                    (user.Password, user.Salt, user.Iterations) = (storedPassword, storedSalt, storedIterations);

                    return user;
                }
            }

            return null;
        }

        public User FindUser(Guid identifier)
        {
            return _repo.FindUser(identifier);
        }

        private static void SetUserHashedPassword(User user, string password)
        {
            var salt = RandomNumberGenerator.GetBytes(SALT_SIZE);

            user.Iterations = ITERATIONS;
            user.Salt = Convert.ToBase64String(salt);
            user.Password = GetHashedPassword(password, salt, ITERATIONS);
        }

        // Same derivation as Sonarr's KeyDerivation.Pbkdf2 call (UTF-8 password, HMAC-SHA512)
        private static string GetHashedPassword(string password, byte[] salt, int iterations)
        {
            return Convert.ToBase64String(Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA512, NUMBER_OF_BYTES));
        }

        private static bool VerifyHashedPassword(User user, string password)
        {
            if (user.Iterations <= 0)
            {
                return false;
            }

            var hashedPassword = GetHashedPassword(password, Convert.FromBase64String(user.Salt), user.Iterations);

            return CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(hashedPassword), Encoding.ASCII.GetBytes(user.Password ?? string.Empty));
        }
    }
}
