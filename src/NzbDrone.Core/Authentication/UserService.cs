using System;
using System.Security.Cryptography;
using System.Text;
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
    }

    public class UserService : IUserService
    {
        private const int ITERATIONS = 10000;
        private const int SALT_SIZE = 128 / 8;
        private const int NUMBER_OF_BYTES = 256 / 8;

        private readonly IUserRepository _repo;
        private readonly IAppFolderInfo _appFolderInfo;
        private readonly IDiskProvider _diskProvider;

        public UserService(IUserRepository repo, IAppFolderInfo appFolderInfo, IDiskProvider diskProvider)
        {
            _repo = repo;
            _appFolderInfo = appFolderInfo;
            _diskProvider = diskProvider;
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

            if (password != null && user.Password != password)
            {
                SetUserHashedPassword(user, password);
            }

            user.Username = username.ToLowerInvariant();

            return Update(user);
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

            var user = _repo.FindUser(username.ToLowerInvariant());

            if (user == null)
            {
                return null;
            }

            if (user.Salt.IsNullOrWhiteSpace())
            {
                // Legacy unsalted SHA-256 hash: on a match, upgrade it to a salted hash
                if (user.Password == password.SHA256Hash())
                {
                    SetUserHashedPassword(user, password);

                    return Update(user);
                }

                return null;
            }

            if (VerifyHashedPassword(user, password))
            {
                return user;
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
