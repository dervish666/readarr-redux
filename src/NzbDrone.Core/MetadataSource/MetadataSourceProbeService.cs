using System;
using System.Collections.Generic;
using System.Net;
using System.Text.Json;
using NLog;
using NzbDrone.Common.Cache;
using NzbDrone.Common.Extensions;
using NzbDrone.Common.Http;

namespace NzbDrone.Core.MetadataSource
{
    public enum MetadataSourceProbeStatus
    {
        Ok,
        NotConfigured,
        InvalidUrl,
        Unreachable,
        AuthFailure,
        ServerError,
        RateLimited,
        NotFound,
        UnexpectedResponse
    }

    public class MetadataSourceProbeResult
    {
        public string Url { get; set; }
        public MetadataSourceProbeStatus Status { get; set; }
        public int? StatusCode { get; set; }
        public string Error { get; set; }
        public DateTime Time { get; set; }

        public string MessageKey => Status switch
        {
            MetadataSourceProbeStatus.Ok => "MetadataSourceStatusOk",
            MetadataSourceProbeStatus.NotConfigured => "MetadataSourceStatusNotConfigured",
            MetadataSourceProbeStatus.InvalidUrl => "MetadataSourceStatusInvalidUrl",
            MetadataSourceProbeStatus.Unreachable => "MetadataSourceStatusUnreachable",
            MetadataSourceProbeStatus.AuthFailure => "MetadataSourceStatusAuthFailure",
            MetadataSourceProbeStatus.ServerError => "MetadataSourceStatusServerError",
            MetadataSourceProbeStatus.RateLimited => "MetadataSourceStatusRateLimited",
            MetadataSourceProbeStatus.NotFound => "MetadataSourceStatusNotFound",
            _ => "MetadataSourceStatusUnexpectedResponse"
        };

        public Dictionary<string, object> MessageTokens => new Dictionary<string, object>
        {
            { "url", Url },
            { "statusCode", StatusCode },
            { "error", Error }
        };
    }

    public interface IMetadataSourceProbeService
    {
        // Always calls the source, then caches the result. For the Test button and for saving the setting.
        MetadataSourceProbeResult Probe(string url);

        // Reuses a result up to a few minutes old. For the health check, so repeated checks don't hammer the source.
        MetadataSourceProbeResult GetCachedProbe(string url);
    }

    public class MetadataSourceProbeService : IMetadataSourceProbeService
    {
        // Goodreads work 1540236 is The Hobbit, so a Goodreads-backed source (rreading-glasses, api.bookinfo.pro) that
        // 404s it is broken rather than missing a book. Hardcover-backed hardcover.bookinfo.pro has a different book
        // under the same number, which is why IsWork checks the shape and not the title. The work is about 20 KB; an
        // author such as Terry Pratchett runs to several MB.
        public const string ProbeWorkId = "1540236";

        private static readonly TimeSpan RequestTimeout = TimeSpan.FromSeconds(10);
        private static readonly TimeSpan CacheLifetime = TimeSpan.FromMinutes(5);

        private readonly IHttpClient _httpClient;
        private readonly ICached<MetadataSourceProbeResult> _cache;
        private readonly Logger _logger;

        public MetadataSourceProbeService(IHttpClient httpClient, ICacheManager cacheManager, Logger logger)
        {
            _httpClient = httpClient;
            _cache = cacheManager.GetCache<MetadataSourceProbeResult>(GetType());
            _logger = logger;
        }

        public MetadataSourceProbeResult Probe(string url)
        {
            var baseUrl = Normalize(url);
            var invalid = CheckUrl(url, baseUrl);

            if (invalid != null)
            {
                return invalid;
            }

            var result = ProbeSource(baseUrl);
            _cache.Set(baseUrl, result, CacheLifetime);

            return result;
        }

        public MetadataSourceProbeResult GetCachedProbe(string url)
        {
            var baseUrl = Normalize(url);

            return CheckUrl(url, baseUrl) ?? _cache.Get(baseUrl, () => ProbeSource(baseUrl), CacheLifetime);
        }

        private static string Normalize(string url)
        {
            return url.IsNullOrWhiteSpace() ? string.Empty : url.Trim().TrimEnd('/');
        }

        private static MetadataSourceProbeResult CheckUrl(string url, string baseUrl)
        {
            if (baseUrl.IsNullOrWhiteSpace())
            {
                return Result(baseUrl, MetadataSourceProbeStatus.NotConfigured);
            }

            if (!Uri.TryCreate(baseUrl, UriKind.Absolute, out var uri) ||
                (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            {
                return Result(url.Trim(), MetadataSourceProbeStatus.InvalidUrl);
            }

            return null;
        }

        private MetadataSourceProbeResult ProbeSource(string baseUrl)
        {
            var request = new HttpRequestBuilder(baseUrl + "/{route}")
                .SetSegment("route", "work/" + ProbeWorkId)
                .Accept(HttpAccept.Json)
                .Build();

            request.SuppressHttpError = true;
            request.AllowAutoRedirect = true;
            request.RequestTimeout = RequestTimeout;

            HttpResponse response;

            try
            {
                response = _httpClient.Execute(request);
            }
            catch (Exception ex)
            {
                _logger.Warn(ex, "Metadata source {0} is unreachable", baseUrl);

                return Result(baseUrl, MetadataSourceProbeStatus.Unreachable, error: ex.Message);
            }

            var statusCode = (int)response.StatusCode;
            var status = Classify(response);

            if (status == MetadataSourceProbeStatus.Ok)
            {
                _logger.Debug("Metadata source {0} is serving data", baseUrl);
            }
            else
            {
                _logger.Warn("Metadata source {0} check failed: {1} (HTTP {2}) for {3}", baseUrl, status, statusCode, request.Url);
            }

            return Result(baseUrl, status, statusCode);
        }

        private static MetadataSourceProbeStatus Classify(HttpResponse response)
        {
            switch (response.StatusCode)
            {
                case HttpStatusCode.OK:
                    return IsWork(response.Content) ? MetadataSourceProbeStatus.Ok : MetadataSourceProbeStatus.UnexpectedResponse;
                case HttpStatusCode.Unauthorized:
                case HttpStatusCode.Forbidden:
                    return MetadataSourceProbeStatus.AuthFailure;
                case HttpStatusCode.NotFound:
                    return MetadataSourceProbeStatus.NotFound;
                case HttpStatusCode.TooManyRequests:
                    return MetadataSourceProbeStatus.RateLimited;
            }

            return (int)response.StatusCode >= 500 ? MetadataSourceProbeStatus.ServerError : MetadataSourceProbeStatus.UnexpectedResponse;
        }

        // Matches the names BookInfoProxy deserialises case-sensitively, so a pass here means the real client can read it.
        // A 200 web page, which is what rreading-glasses and api.bookinfo.pro return for an unknown path such as /v1/, fails.
        private static bool IsWork(string content)
        {
            if (content.IsNullOrWhiteSpace())
            {
                return false;
            }

            try
            {
                using var document = JsonDocument.Parse(content);
                var root = document.RootElement;

                return root.ValueKind == JsonValueKind.Object &&
                       root.TryGetProperty("ForeignId", out var foreignId) &&
                       foreignId.ValueKind == JsonValueKind.Number &&
                       root.TryGetProperty("Title", out var title) &&
                       title.ValueKind == JsonValueKind.String &&
                       title.GetString().IsNotNullOrWhiteSpace();
            }
            catch (JsonException)
            {
                return false;
            }
        }

        private static MetadataSourceProbeResult Result(string url, MetadataSourceProbeStatus status, int? statusCode = null, string error = null)
        {
            return new MetadataSourceProbeResult
            {
                Url = url,
                Status = status,
                StatusCode = statusCode,
                Error = error,
                Time = DateTime.UtcNow
            };
        }
    }
}
