using NzbDrone.Core.Configuration;
using NzbDrone.Core.Messaging.Commands;

namespace NzbDrone.Core.Authentication
{
    public class ApiKeyResetService : IExecute<ResetApiKeyCommand>
    {
        private readonly IUserService _userService;
        private readonly IConfigFileProvider _configFileProvider;

        public ApiKeyResetService(IUserService userService, IConfigFileProvider configFileProvider)
        {
            _userService = userService;
            _configFileProvider = configFileProvider;
        }

        public void Execute(ResetApiKeyCommand message)
        {
            // Sessions go first, and a failure stops the reset: a login cookie that outlived it
            // could read the new key from /initialize.json
            _userService.RevokeSessions();
            _configFileProvider.ResetApiKey();
        }
    }
}
