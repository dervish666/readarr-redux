using System;
using System.Linq;
using NzbDrone.Core.Books;

namespace NzbDrone.Core.MetadataSource
{
    // The metadata source never says which site its IDs belong to, but the links it serves do: a Goodreads-backed
    // rreading-glasses links goodreads.com, a Hardcover-backed one hardcover.app.
    public static class MetadataProvider
    {
        public static string NameFromUrl(string url)
        {
            // On Linux and macOS a bare path parses as an absolute file:// URI
            if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            {
                return null;
            }

            var host = uri.Host.ToLowerInvariant();

            if (host == "goodreads.com" || host.EndsWith(".goodreads.com"))
            {
                return "Goodreads";
            }

            if (host == "hardcover.app" || host.EndsWith(".hardcover.app"))
            {
                return "Hardcover";
            }

            return host.StartsWith("www.") ? host.Substring(4) : host;
        }

        // The key an edition's ID goes under in Calibre and ebook identifiers. Editions stored without links came from
        // Goodreads, the only source this fork has had until now.
        public static string IdentifierKey(Edition edition)
        {
            var name = edition.Links?.Select(x => NameFromUrl(x.Url)).FirstOrDefault(x => x != null) ?? "Goodreads";

            return name.ToLowerInvariant();
        }
    }
}
