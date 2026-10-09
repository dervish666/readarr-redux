using System;
using System.Linq;
using System.Net;
using NLog;
using NzbDrone.Common.Http;
using NzbDrone.Core.Exceptions;
using NzbDrone.Core.Http;

namespace NzbDrone.Core.MetadataSource.Goodreads
{
    // Only Goodreads listopia is still fetched from goodreads.com directly, with a key baked into the binary.
    // It breaks when Goodreads revokes that key, and nothing on the metadata source replaces it.
    public class GoodreadsProxy : IProvideListInfo
    {
        private readonly ICachedHttpResponseService _cachedHttpClient;
        private readonly Logger _logger;

        public GoodreadsProxy(ICachedHttpResponseService cachedHttpClient,
                              Logger logger)
        {
            _cachedHttpClient = cachedHttpClient;
            _logger = logger;
        }

        public ListResource GetListInfo(int foreignListId, int page, bool useCache = true)
        {
            _logger.Debug("Getting List with GoodreadsId of {0}", foreignListId);

            var httpRequest = new HttpRequestBuilder("https://www.goodreads.com/book/list/listopia.xml")
                .AddQueryParam("key", new string("whFzJP3Ud0gZsAdyXxSr7T".Reverse().ToArray()))
                .AddQueryParam("_nc", "1")
                .AddQueryParam("format", "xml")
                .AddQueryParam("id", foreignListId)
                .AddQueryParam("items_per_page", 30)
                .AddQueryParam("page", page)
                .SetHeader("User-Agent", "Goodreads/3.33.1 (iPhone; iOS 14.3; Scale/3.00)")
                .SetHeader("X_APPLE_DEVICE_MODEL", "iPhone")
                .SetHeader("x-gr-os-version", "iOS 14.3")
                .SetHeader("Accept-Language", "en-GB;q=1")
                .SetHeader("X_APPLE_APP_VERSION", "761")
                .SetHeader("x-gr-app-version", "761")
                .SetHeader("x-gr-hw-model", "iPhone11,6")
                .SetHeader("X_APPLE_SYSTEM_VERSION", "14.3")
                .KeepAlive()
                .Build();

            httpRequest.AllowAutoRedirect = true;
            httpRequest.SuppressHttpError = true;

            var httpResponse = _cachedHttpClient.Get(httpRequest, useCache, TimeSpan.FromDays(7));

            if (httpResponse.HasHttpError)
            {
                if (httpResponse.StatusCode == HttpStatusCode.BadRequest)
                {
                    throw new BadRequestException(foreignListId.ToString());
                }
                else
                {
                    throw new HttpException(httpRequest, httpResponse);
                }
            }

            return httpResponse.Deserialize<ListResource>();
        }
    }
}
