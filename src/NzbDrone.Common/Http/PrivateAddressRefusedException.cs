using System.Net;
using NzbDrone.Common.Exceptions;

namespace NzbDrone.Common.Http
{
    public class PrivateAddressRefusedException : NzbDroneException
    {
        public PrivateAddressRefusedException(string host, IPAddress address)
            : base("Refused to connect to {0}: it resolves to {1}, which is not a public address", host, address)
        {
            Host = host;
            Address = address;
        }

        public string Host { get; }
        public IPAddress Address { get; }
    }
}
