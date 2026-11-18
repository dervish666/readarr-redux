using System;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HttpOverrides;
using NLog;
using NzbDrone.Common.Extensions;
using NzbDrone.Common.Instrumentation;
using NzbDrone.Common.Network;
using NzbDrone.Core.Configuration;
using IPNetwork = System.Net.IPNetwork;

namespace NzbDrone.Host
{
    public static class ForwardedHeadersConfigurator
    {
        private static readonly Logger Logger = NzbDroneLogger.GetLogger(typeof(ForwardedHeadersConfigurator));

        public static void Configure(ForwardedHeadersOptions options, IConfigFileProvider configFileProvider)
        {
            options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost;

            // Walk the whole chain of trusted proxies instead of stopping after one hop, so a second
            // proxy appending a trusted address can't stand in for the real client.
            options.ForwardLimit = null;

            // Loopback (127.0.0.0/8 and ::1) is trusted by default. Forwarded headers from any other
            // peer are only processed when it is on one of the Trusted Networks.
            var trustedNetworks = configFileProvider.TrustedNetworks;

            if (trustedNetworks.IsNullOrWhiteSpace())
            {
                return;
            }

            foreach (var entry in trustedNetworks.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries))
            {
                if (IPNetworkParser.TryParse(entry, out var address, out var prefixLength))
                {
                    options.KnownIPNetworks.Add(new IPNetwork(address, prefixLength));

                    Logger.Info("Trusting forwarded headers from {0}/{1}", address, prefixLength);
                }
                else
                {
                    Logger.Warn("Invalid trusted network '{0}', forwarded headers from it will not be trusted", entry);
                }
            }
        }
    }
}
