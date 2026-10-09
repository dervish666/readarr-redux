using System;
using System.Collections.Generic;
using System.Net;
using NLog;
using NzbDrone.Common.Http;
using NzbDrone.Core.Http;

namespace NzbDrone.Core.MetadataSource.Goodreads
{
    public interface IGoodreadsSearchProxy
    {
        public List<SearchJsonResource> Search(string query);
    }

    public class GoodreadsSearchProxy : IGoodreadsSearchProxy
    {
        private readonly ICachedHttpResponseService _cachedHttpClient;
        private readonly IMetadataRequestBuilder _requestBuilder;
        private readonly Logger _logger;

        public GoodreadsSearchProxy(ICachedHttpResponseService cachedHttpClient,
            IMetadataRequestBuilder requestBuilder,
            Logger logger)
        {
            _cachedHttpClient = cachedHttpClient;
            _requestBuilder = requestBuilder;
            _logger = logger;
        }

        public List<SearchJsonResource> Search(string query)
        {
            try
            {
                // The metadata source answers ISBN and ASIN queries here too, falling back to a title search
                var httpRequest = _requestBuilder.GetRequestBuilder().Create()
                    .SetSegment("route", "search")
                    .AddQueryParam("q", query)
                    .Build();

                var response = _cachedHttpClient.Get<List<SearchJsonResource>>(httpRequest, true, TimeSpan.FromDays(5));

                return response.Resource;
            }
            catch (HttpException ex)
            {
                _logger.Warn(ex);
                throw new GoodreadsException("Search for '{0}' failed. Unable to communicate with the metadata source.", ex, query);
            }
            catch (WebException ex)
            {
                _logger.Warn(ex);
                throw new GoodreadsException("Search for '{0}' failed. Unable to communicate with the metadata source.", ex, query, ex.Message);
            }
            catch (Exception ex) when (ex is not MetadataSourceNotConfiguredException)
            {
                _logger.Warn(ex);
                throw new GoodreadsException("Search for '{0}' failed. Invalid response received from the metadata source.", ex, query);
            }
        }
    }
}
