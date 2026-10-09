using System;
using System.Collections.Generic;
using System.Net;
using System.Text.Json;
using NLog;
using NzbDrone.Common.Cache;
using NzbDrone.Common.Extensions;
using NzbDrone.Common.Http;
using NzbDrone.Common.Serializer;
using NzbDrone.Core.MetadataSource.BookInfo;

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
        Redirect,
        ResponseTooLarge,
        NotFound,
        UnexpectedResponse
    }

    public class MetadataSourceProbeResult
    {
        public string Url { get; set; }
        public MetadataSourceProbeStatus Status { get; set; }
        public int? StatusCode { get; set; }
        public string Error { get; set; }
        public string Location { get; set; }
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
            MetadataSourceProbeStatus.Redirect => "MetadataSourceStatusRedirect",
            MetadataSourceProbeStatus.ResponseTooLarge => "MetadataSourceStatusResponseTooLarge",
            MetadataSourceProbeStatus.NotFound => "MetadataSourceStatusNotFound",
            _ => "MetadataSourceStatusUnexpectedResponse"
        };

        public Dictionary<string, object> MessageTokens => new Dictionary<string, object>
        {
            { "url", Url },
            { "statusCode", StatusCode },
            { "error", Error },
            { "location", Location }
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
        // under the same number, which is why IsWork checks the ID and shape but not the title. The work is about 20 KB;
        // an author such as Terry Pratchett runs to several MB.
        public const string ProbeWorkId = "1540236";

        private const long MaxResponseLength = 2 * 1024 * 1024;

        // One hop, since redirects aren't followed, so this is the whole probe's time limit
        private static readonly TimeSpan RequestTimeout = TimeSpan.FromSeconds(10);
        private static readonly TimeSpan CacheLifetime = TimeSpan.FromMinutes(5);

        // The same settings BookInfoProxy reads works with
        private static readonly JsonSerializerOptions SerializerSettings = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = false,
            Converters = { new STJUtcConverter() }
        };

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

        // An address BookInfoProxy can build requests on: plain http or https, with no credentials, query or fragment,
        // and nothing HttpRequestBuilder rejects (it throws on userinfo and non-ASCII hosts, which used to surface as a 500)
        public static bool IsUsableUrl(string url)
        {
            var baseUrl = Normalize(url);

            if (!Uri.TryCreate(baseUrl, UriKind.Absolute, out var uri) ||
                (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps) ||
                uri.UserInfo.IsNotNullOrWhiteSpace() ||
                uri.Query.IsNotNullOrWhiteSpace() ||
                uri.Fragment.IsNotNullOrWhiteSpace())
            {
                return false;
            }

            try
            {
                BuildRequest(baseUrl);
                return true;
            }
            catch (Exception ex) when (ex is ArgumentException or FormatException)
            {
                return false;
            }
        }

        private static HttpRequest BuildRequest(string baseUrl)
        {
            return new HttpRequestBuilder(baseUrl + "/{route}")
                .SetSegment("route", "work/" + ProbeWorkId)
                .Accept(HttpAccept.Json)
                .Build();
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

            if (!IsUsableUrl(baseUrl))
            {
                return Result(url.Trim(), MetadataSourceProbeStatus.InvalidUrl);
            }

            return null;
        }

        private MetadataSourceProbeResult ProbeSource(string baseUrl)
        {
            var request = BuildRequest(baseUrl);

            // No redirects. BookInfoProxy reads a redirect on a work as "this work moved to an author" and never follows
            // it, and following one would let a source point the probe at any host on the user's network.
            request.SuppressHttpError = true;
            request.AllowAutoRedirect = false;
            request.RequestTimeout = RequestTimeout;

            // The probe work is about 20 KB, so anything near this is not a work, and an endless or gzip-bomb body
            // from a hostile address must not be able to fill memory
            request.MaxResponseLength = MaxResponseLength;

            HttpResponse response;

            try
            {
                response = _httpClient.Execute(request);
            }
            catch (HttpResponseTooLargeException ex)
            {
                _logger.Warn(ex, "Metadata source {0} sent a response over {1} bytes", baseUrl, MaxResponseLength);

                return Result(baseUrl, MetadataSourceProbeStatus.ResponseTooLarge, error: ex.Message);
            }
            catch (Exception ex)
            {
                _logger.Warn(ex, "Metadata source {0} is unreachable", baseUrl);

                return Result(baseUrl, MetadataSourceProbeStatus.Unreachable, error: ex.Message);
            }

            var statusCode = (int)response.StatusCode;
            var location = GetRedirectLocation(response);
            var status = location != null ? MetadataSourceProbeStatus.Redirect : Classify(response);

            if (status == MetadataSourceProbeStatus.Ok)
            {
                _logger.Debug("Metadata source {0} is serving data", baseUrl);
            }
            else
            {
                _logger.Warn("Metadata source {0} check failed: {1} (HTTP {2}) for {3}{4}", baseUrl, status, statusCode, request.Url, location == null ? string.Empty : " -> " + location);
            }

            var result = Result(baseUrl, status, statusCode);
            result.Location = location;

            return result;
        }

        // The absolute address a redirect points at, so the user can see what to type instead
        private static string GetRedirectLocation(HttpResponse response)
        {
            var location = response.HasHttpRedirect ? response.Headers.GetSingleValue("Location") : null;

            if (location.IsNullOrWhiteSpace())
            {
                return null;
            }

            return Uri.TryCreate((Uri)response.Request.Url, location, out var absolute) ? absolute.ToString() : location;
        }

        private MetadataSourceProbeStatus Classify(HttpResponse response)
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

        // Deserialises into BookInfoProxy's own WorkResource with the same settings, so a string, fractional or
        // overflowing ID fails here exactly as it would there. A 200 web page, which is what rreading-glasses and
        // api.bookinfo.pro return for an unknown path such as /v1/, fails too.
        private bool IsWork(string content)
        {
            if (content.IsNullOrWhiteSpace())
            {
                return false;
            }

            WorkResource work;

            try
            {
                work = JsonSerializer.Deserialize<WorkResource>(content, SerializerSettings);
            }
            catch (Exception ex)
            {
                // The caller reports UnexpectedResponse; this keeps the reason
                _logger.Debug(ex, "Metadata source probe response is not a work");
                return false;
            }

            // A work with no editions or no author can't be added, so it doesn't count as serving data
            return work != null &&
                   work.ForeignId.ToString() == ProbeWorkId &&
                   work.Title.IsNotNullOrWhiteSpace() &&
                   work.Books is { Count: > 0 } &&
                   work.Authors is { Count: > 0 };
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
