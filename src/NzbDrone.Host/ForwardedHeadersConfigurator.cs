using System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HttpOverrides;

namespace NzbDrone.Host
{
    public static class ForwardedHeadersConfigurator
    {
        public static void Configure(ForwardedHeadersOptions options)
        {
            options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost;

            // Walk the whole chain of trusted proxies instead of stopping after one hop, so a second
            // proxy appending a private address can't stand in for the real client.
            options.ForwardLimit = null;

            // Loopback (127.0.0.0/8 and ::1) is trusted by default; add the private ranges a reverse
            // proxy or tunnel on the LAN or a Docker network would connect from. Forwarded headers
            // from any other peer are left unprocessed.
            options.KnownNetworks.Add(new IPNetwork(IPAddress.Parse("10.0.0.0"), 8));
            options.KnownNetworks.Add(new IPNetwork(IPAddress.Parse("172.16.0.0"), 12));
            options.KnownNetworks.Add(new IPNetwork(IPAddress.Parse("192.168.0.0"), 16));
            options.KnownNetworks.Add(new IPNetwork(IPAddress.Parse("fc00::"), 7));
            options.KnownNetworks.Add(new IPNetwork(IPAddress.Parse("fe80::"), 10));
        }
    }
}
