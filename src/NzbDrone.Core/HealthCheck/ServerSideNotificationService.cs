using System.Collections.Generic;

namespace NzbDrone.Core.HealthCheck
{
    public interface IServerSideNotificationService
    {
        public List<HealthCheck> GetServerChecks();
    }

    // Upstream pulled health messages from readarr.servarr.com every two hours and showed them in System > Status.
    // The fork has no notification server, so there are never any server checks.
    public class ServerSideNotificationService : IServerSideNotificationService
    {
        public List<HealthCheck> GetServerChecks()
        {
            return new List<HealthCheck>();
        }
    }
}
