using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Http;
using NzbDrone.Common.EnvironmentInfo;
using NzbDrone.Core.Datastore;

namespace Readarr.Http.Extensions
{
    public static class RequestExtensions
    {
        // See src/Readarr.Api.V1/Queue/QueueModule.cs
        private static readonly HashSet<string> VALID_SORT_KEYS = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "authors.sortname", //Workaround authors table properties not being added on isValidSortKey call
            "timeleft",
            "estimatedCompletionTime",
            "protocol",
            "indexer",
            "downloadClient",
            "quality",
            "status",
            "title",
            "progress"
        };

        private static readonly HashSet<string> EXCLUDED_KEYS = new HashSet<string>(StringComparer.InvariantCultureIgnoreCase)
        {
            "page",
            "pageSize",
            "sortKey",
            "sortDirection",
            "filterKey",
            "filterValue",
        };

        public static bool IsApiRequest(this HttpRequest request)
        {
            return request.Path.StartsWithSegments("/api", StringComparison.InvariantCultureIgnoreCase);
        }

        public static bool GetBooleanQueryParameter(this HttpRequest request, string parameter, bool defaultValue = false)
        {
            var parameterValue = request.Query[parameter];

            if (parameterValue.Any())
            {
                return bool.Parse(parameterValue.ToString());
            }

            return defaultValue;
        }

        public static PagingResource<TResource> ApplyToPage<TResource, TModel>(this PagingSpec<TModel> pagingSpec, Func<PagingSpec<TModel>, PagingSpec<TModel>> function, Converter<TModel, TResource> mapper)
        {
            pagingSpec = function(pagingSpec);

            return new PagingResource<TResource>
            {
                Page = pagingSpec.Page,
                PageSize = pagingSpec.PageSize,
                SortDirection = pagingSpec.SortDirection,
                SortKey = pagingSpec.SortKey,
                TotalRecords = pagingSpec.TotalRecords,
                Records = pagingSpec.Records.ConvertAll(mapper)
            };
        }

        public static string GetRemoteIP(this HttpContext context)
        {
            return context?.Request?.GetRemoteIP() ?? "Unknown";
        }

        public static string GetRemoteIP(this HttpRequest request)
        {
            if (request == null)
            {
                return "Unknown";
            }

            var remoteIP = request.HttpContext.Connection.RemoteIpAddress;

            if (remoteIP == null)
            {
                return "Unknown";
            }

            if (remoteIP.IsIPv4MappedToIPv6)
            {
                remoteIP = remoteIP.MapToIPv4();
            }

            return remoteIP.ToString();
        }

        public static void DisableCache(this IHeaderDictionary headers)
        {
            headers.Remove("Last-Modified");
            headers["Cache-Control"] = "no-cache, no-store";
            headers["Expires"] = "-1";
            headers["Pragma"] = "no-cache";
        }

        // Covers come from third-party hosts and are served from Readarr's own origin. Stop the
        // browser guessing a type, and if one is ever opened directly as a page, give it no script,
        // no plugins and an opaque origin, so it cannot reach the API with the user's session.
        public static void AddImageSecurityHeaders(this IHeaderDictionary headers)
        {
            headers["X-Content-Type-Options"] = "nosniff";
            headers["Content-Security-Policy"] = "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox";
        }

        public static void EnableCache(this IHeaderDictionary headers)
        {
            headers["Cache-Control"] = "max-age=31536000, public";
            headers["Last-Modified"] = BuildInfo.BuildDateTime.ToString("r");
        }
    }
}
