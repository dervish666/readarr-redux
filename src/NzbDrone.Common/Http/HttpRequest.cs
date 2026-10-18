using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using NzbDrone.Common.EnvironmentInfo;
using NzbDrone.Common.Extensions;

namespace NzbDrone.Common.Http
{
    public class HttpRequest
    {
        public HttpRequest(string url, HttpAccept httpAccept = null)
        {
            Method = HttpMethod.Get;
            Url = new HttpUri(url);
            Headers = new HttpHeader();
            ConnectionKeepAlive = true;
            AllowAutoRedirect = true;
            StoreRequestCookie = true;
            LogHttpError = true;
            Cookies = new Dictionary<string, string>();

            if (!RuntimeInfo.IsProduction)
            {
                AllowAutoRedirect = false;
            }

            if (httpAccept != null)
            {
                Headers.Accept = httpAccept.Value;
            }
        }

        public HttpUri Url { get; set; }
        public HttpMethod Method { get; set; }
        public HttpHeader Headers { get; set; }
        public byte[] ContentData { get; set; }
        public string ContentSummary { get; set; }
        public ICredentials Credentials { get; set; }
        public bool SuppressHttpError { get; set; }
        public IEnumerable<HttpStatusCode> SuppressHttpErrorStatusCodes { get; set; }
        public bool UseSimplifiedUserAgent { get; set; }
        public bool AllowAutoRedirect { get; set; }
        public bool ConnectionKeepAlive { get; set; }
        public bool LogResponseContent { get; set; }
        public bool LogHttpError { get; set; }
        public Dictionary<string, string> Cookies { get; private set; }
        public bool StoreRequestCookie { get; set; }
        public bool StoreResponseCookie { get; set; }
        public TimeSpan RequestTimeout { get; set; }
        public TimeSpan RateLimit { get; set; }
        public string RateLimitKey { get; set; }
        public Stream ResponseStream { get; set; }

        // Bytes of body, after decompression, to read before giving up with HttpResponseTooLargeException. Null reads it all.
        public long? MaxResponseLength { get; set; }

        // For URLs a third party chose, such as covers from the metadata source: a direct connection may only go to a
        // public address, checked against the resolved address at connect time and again on every redirect. Hosts in
        // PrivateAddressHosts are exempt. A configured proxy does its own resolving, so the check does not apply there.
        public bool PublicAddressesOnly { get; set; }
        public HashSet<string> PrivateAddressHosts { get; } = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        public override string ToString()
        {
            return ToString();
        }

        public string ToString(bool includeMethod = true, bool includeSummary = true)
        {
            var builder = new StringBuilder();

            if (includeMethod)
            {
                builder.AppendFormat("Req: [{0}] ", Method);
            }

            builder.Append(Url);

            if (includeSummary && ContentSummary.IsNotNullOrWhiteSpace())
            {
                builder.Append(": ");
                builder.Append(ContentSummary);
            }

            return builder.ToString();
        }

        public void SetContent(byte[] data)
        {
            ContentData = data;
        }

        public void SetContent(string data)
        {
            var encoding = HttpHeader.GetEncodingFromContentType(Headers.ContentType);
            ContentData = encoding.GetBytes(data);
        }
    }
}
