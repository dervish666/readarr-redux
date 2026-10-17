using System;
using NzbDrone.Common.Extensions;
using NzbDrone.Common.Http;

namespace NzbDrone.Core.MediaCover
{
    // Cover URLs are whatever the metadata source hands over, so a request for one may only reach a public address,
    // or the metadata source's own host for a self-hosted setup that serves its covers too. Without this a hostile
    // source could point Readarr at services on its LAN or loopback.
    public static class CoverRequest
    {
        public static HttpRequest Create(string url, string metadataSource)
        {
            var request = new HttpRequest(url)
            {
                AllowAutoRedirect = true,
                RequestTimeout = TimeSpan.FromSeconds(300),
                MaxResponseLength = CoverImageFormat.MaxLength,
                PublicAddressesOnly = true
            };

            if (metadataSource.IsNotNullOrWhiteSpace() &&
                Uri.TryCreate(metadataSource.Trim(), UriKind.Absolute, out var sourceUri))
            {
                request.PrivateAddressHosts.Add(sourceUri.IdnHost);
            }

            return request;
        }
    }
}
