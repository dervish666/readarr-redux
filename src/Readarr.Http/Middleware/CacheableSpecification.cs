using System;
using Microsoft.AspNetCore.Http;
using NzbDrone.Common.EnvironmentInfo;
using NzbDrone.Common.Extensions;

namespace Readarr.Http.Middleware
{
    public interface ICacheableSpecification
    {
        bool IsCacheable(HttpRequest request);
    }

    public class CacheableSpecification : ICacheableSpecification
    {
        public bool IsCacheable(HttpRequest request)
        {
            if (!RuntimeInfo.IsProduction)
            {
                return false;
            }

            var path = request.Path.Value ?? "";

            // Backups, logs and initialize.json (which carries the API key) are never cacheable, even with a hash query
            if (path.StartsWith("/backup", StringComparison.OrdinalIgnoreCase) ||
                path.StartsWith("/logfile", StringComparison.OrdinalIgnoreCase) ||
                path.StartsWith("/updatelogfile", StringComparison.OrdinalIgnoreCase) ||
                path.EndsWith("/initialize.json", StringComparison.OrdinalIgnoreCase) ||
                path.EndsWith("/initialize.js", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            if (request.Query.ContainsKey("h"))
            {
                return true;
            }

            if (request.Path.StartsWithSegments("/api", StringComparison.CurrentCultureIgnoreCase))
            {
                if (request.Path.ToString().ContainsIgnoreCase("/MediaCover"))
                {
                    return true;
                }

                return false;
            }

            if (request.Path.StartsWithSegments("/signalr", StringComparison.CurrentCultureIgnoreCase))
            {
                return false;
            }

            if (path.EndsWith("/index.js"))
            {
                return false;
            }

            if (path.StartsWith("/feed", StringComparison.CurrentCultureIgnoreCase))
            {
                return false;
            }

            return true;
        }
    }
}
