using System;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using NLog;
using NzbDrone.Core.Configuration;
using NzbDrone.Core.Lifecycle;
using NzbDrone.Core.Messaging.Events;

namespace NzbDrone.Core.Authentication
{
    public interface ISetupCodeService
    {
        bool IsRequired { get; }
        bool IsValidProof(string proof);
        string Verify(string code);
    }

    // With no login set up, being local isn't proof of anything: a reverse proxy on the same machine that sends no
    // X-Forwarded-For makes every request it forwards come from loopback. So until setup is finished the web UI
    // also asks for a code that only someone who can read Readarr's log or console has. It is made fresh on every
    // start and never stored. Setup is finished by choosing a login method, or by setting AuthenticationNoneConfirmed.
    public class SetupCodeService : ISetupCodeService, IHandle<ApplicationStartedEvent>
    {
        // No 0/O or 1/I, so a code read off a console is typed back right. 12 of 32 characters is 60 bits.
        private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        private const int Length = 12;

        private readonly IConfigFileProvider _configFileProvider;
        private readonly Logger _logger;
        private readonly object _sync = new object();
        private string _code;

        public SetupCodeService(IConfigFileProvider configFileProvider, Logger logger)
        {
            _configFileProvider = configFileProvider;
            _logger = logger;
        }

        public bool IsRequired => _configFileProvider.AuthenticationMethod == AuthenticationType.None &&
                                  !_configFileProvider.AuthenticationNoneConfirmed;

        // A browser that entered the code carries this in a cookie. A restart makes a new code, so old cookies stop working.
        public bool IsValidProof(string proof)
        {
            if (string.IsNullOrEmpty(proof))
            {
                return false;
            }

            return CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(proof), Encoding.ASCII.GetBytes(Proof(GetCode())));
        }

        // The proof for the cookie when the code is right, otherwise null
        public string Verify(string code)
        {
            var entered = Normalize(code);
            var current = GetCode();

            if (entered.Length != current.Length ||
                !CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(entered), Encoding.ASCII.GetBytes(current)))
            {
                return null;
            }

            return Proof(current);
        }

        // For tests, which can't read it off the console
        internal string CurrentCode => GetCode();

        public void Handle(ApplicationStartedEvent message)
        {
            if (IsRequired)
            {
                GetCode();
            }
        }

        private string GetCode()
        {
            lock (_sync)
            {
                if (_code == null)
                {
                    _code = RandomNumberGenerator.GetString(Alphabet, Length);

                    _logger.Warn("No login is set up yet. To open the web UI, enter this one-time setup code: {0}. " +
                                 "It changes every time Readarr starts, and is no longer needed once a login is set up.",
                                 Format(_code));
                }

                return _code;
            }
        }

        public static string Format(string code)
        {
            return string.Join("-", Enumerable.Range(0, code.Length / 4).Select(i => code.Substring(i * 4, 4)));
        }

        private static string Normalize(string code)
        {
            return new string((code ?? string.Empty).Where(char.IsLetterOrDigit).Select(char.ToUpperInvariant).ToArray());
        }

        private static string Proof(string code)
        {
            return Convert.ToHexString(SHA256.HashData(Encoding.ASCII.GetBytes("readarr-setup:" + code)));
        }
    }
}
