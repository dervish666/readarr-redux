using System;
using System.Net;
using System.Text.Json;
using NLog;
using NzbDrone.Common.Extensions;
using NzbDrone.Common.Http;

namespace NzbDrone.Core.Http
{
    public interface ICachedHttpResponseService
    {
        HttpResponse Get(HttpRequest request, bool useCache, TimeSpan ttl);
        HttpResponse<T> Get<T>(HttpRequest request, bool useCache, TimeSpan ttl)
            where T : new();
    }

    public class CachedHttpResponseService : ICachedHttpResponseService
    {
        // Marks a response served from the cache because the live call failed. Fine to search with, but a refresh
        // must not mistake it for current metadata.
        public const string StaleResponseHeader = "X-Readarr-Stale-Response";

        private readonly ICachedHttpResponseRepository _repo;
        private readonly IHttpClient _httpClient;
        private readonly Logger _logger;

        public CachedHttpResponseService(ICachedHttpResponseRepository httpResponseRepository,
                                         IHttpClient httpClient,
                                         Logger logger)
        {
            _repo = httpResponseRepository;
            _httpClient = httpClient;
            _logger = logger;
        }

        public HttpResponse Get(HttpRequest request, bool useCache, TimeSpan ttl)
        {
            var cached = _repo.FindByUrl(request.Url.ToString());

            if (useCache && cached != null && cached.Expiry > DateTime.UtcNow)
            {
                _logger.Trace($"Returning cached response for [GET] {request.Url}");
                return new HttpResponse(request, new HttpHeader(), cached.Value, (HttpStatusCode)cached.StatusCode);
            }

            HttpResponse result;

            try
            {
                result = _httpClient.Get(request);
            }
            catch (HttpException ex) when (cached != null && IsOutage(ex.Response.StatusCode))
            {
                return Stale(request, cached, ex.Response.StatusCode.ToString());
            }
            catch (WebException ex) when (cached != null)
            {
                return Stale(request, cached, ex.Status.ToString());
            }
            catch (System.Net.Http.HttpRequestException ex) when (cached != null)
            {
                // A refused connection, unknown host or no route surfaces from the dispatcher as this, not WebException
                return Stale(request, cached, ex.Message);
            }

            if (result.HasHttpError && cached != null && IsOutage(result.StatusCode))
            {
                return Stale(request, cached, result.StatusCode.ToString());
            }

            if (!result.HasHttpError && IsComplete(result))
            {
                if (cached == null)
                {
                    cached = new CachedHttpResponse
                    {
                        Url = request.Url.ToString(),
                    };
                }

                var now = DateTime.UtcNow;

                cached.LastRefresh = now;
                cached.Expiry = now.Add(ttl);
                cached.Value = result.Content;
                cached.StatusCode = (int)result.StatusCode;

                // The response is good whether or not it can be cached
                try
                {
                    _repo.Upsert(cached);
                }
                catch (Exception ex)
                {
                    _logger.Warn(ex, "Failed to cache response for [GET] {0}", request.Url);
                }
            }

            return result;
        }

        // A metadata source that is down, or whose upstream key was revoked, answers 401, 5xx or nothing at all.
        // The last good answer beats an error for every author and book until it recovers. 404 and 429 are real answers.
        private static bool IsOutage(HttpStatusCode statusCode)
        {
            return statusCode == HttpStatusCode.Unauthorized || (int)statusCode >= 500;
        }

        // Only a complete answer may replace the copy an outage falls back to. An empty body, truncated or malformed
        // JSON, or an HTML error page sent with a 200 would otherwise be replayed until the source recovers.
        private static bool IsComplete(HttpResponse response)
        {
            var body = response.Content;

            if (body.IsNullOrWhiteSpace())
            {
                return false;
            }

            var contentType = response.Headers.ContentType ?? string.Empty;

            if (contentType.Contains("html", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            var start = body.TrimStart()[0];

            if (!contentType.Contains("json", StringComparison.OrdinalIgnoreCase) && start != '{' && start != '[')
            {
                return true;
            }

            try
            {
                using (JsonDocument.Parse(body))
                {
                    return true;
                }
            }
            catch (JsonException)
            {
                return false;
            }
        }

        private HttpResponse Stale(HttpRequest request, CachedHttpResponse cached, string reason)
        {
            _logger.Warn("{0} from [GET] {1}, using the response cached at {2:u}", reason, request.Url, cached.LastRefresh);

            var headers = new HttpHeader();
            headers.Add(StaleResponseHeader, cached.LastRefresh.ToString("u"));

            return new HttpResponse(request, headers, cached.Value, (HttpStatusCode)cached.StatusCode);
        }

        public HttpResponse<T> Get<T>(HttpRequest request, bool useCache, TimeSpan ttl)
            where T : new()
        {
            var response = Get(request, useCache, ttl);
            return new HttpResponse<T>(response);
        }
    }
}
