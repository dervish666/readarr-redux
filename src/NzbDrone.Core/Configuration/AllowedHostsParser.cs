using System;
using System.Collections.Generic;
using System.Linq;
using NzbDrone.Common.Extensions;

namespace NzbDrone.Core.Configuration
{
    public static class AllowedHostsParser
    {
        private static readonly char[] Separators = { ',', ';' };
        private static readonly string[] BindAddresses = { "0.0.0.0", "[::]" };

        public static List<string> Parse(string value)
        {
            if (value.IsNullOrWhiteSpace())
            {
                return new List<string>();
            }

            return value.Split(Separators, StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                        .Select(Normalize)
                        .Distinct()
                        .ToList();
        }

        public static bool IsValidHost(string host)
        {
            if (host.IsNullOrWhiteSpace())
            {
                return false;
            }

            if (host.StartsWith("*."))
            {
                return Uri.CheckHostName(host.Substring(2)) == UriHostNameType.Dns;
            }

            return Uri.CheckHostName(host) != UriHostNameType.Unknown;
        }

        public static bool IsBindAddress(string host)
        {
            return BindAddresses.Contains(host);
        }

        // True when the list names at least one host and doesn't let every host in, so the host
        // filtering middleware turns away requests for any other host name
        public static bool IsRestricted(string value)
        {
            var hosts = Parse(value).Where(h => !IsBindAddress(h)).ToList();

            return hosts.Count > 0 && !hosts.Contains("*");
        }

        private static string Normalize(string host)
        {
            if (!IsBracketed(host) && host.Contains(':') && host.IsValidIpAddress())
            {
                return $"[{host}]";
            }

            return host;
        }

        private static bool IsBracketed(string host)
        {
            return host.StartsWith("[") && host.EndsWith("]");
        }
    }
}
