using System;
using System.Net;
using NLog;
using NzbDrone.Common.Http;

namespace NzbDrone.Core.MetadataSource
{
    // rreading-glasses answers 429 with a Retry-After of about 30s when its author queue is full, and a proxy in front
    // of it answers 502 to 504 while it restarts. Both are worth waiting out, but only for so long: an uncapped loop
    // could hold a command thread for half an hour, or forever.
    public static class MetadataRetry
    {
        private const int MaxRateLimitedTries = 5;
        private const int MaxGatewayRetries = 2;
        private static readonly TimeSpan MaxRetryAfter = TimeSpan.FromSeconds(60);

        public static HttpResponse Execute(Func<HttpResponse> send, Action<TimeSpan> sleep, Logger logger)
        {
            var rateLimited = 0;
            var gatewayRetries = 0;

            while (true)
            {
                HttpResponse response;

                try
                {
                    response = send();
                }
                catch (WebException ex) when (IsTimeout(ex) && gatewayRetries < MaxGatewayRetries)
                {
                    if (!Wait(BackOff(++gatewayRetries), "timed out", sleep, logger))
                    {
                        throw;
                    }

                    continue;
                }

                if (response.StatusCode == HttpStatusCode.TooManyRequests && ++rateLimited < MaxRateLimitedTries)
                {
                    var retryAfter = RetryAfter(response);

                    // A source asking for more than a minute is not coming back soon enough to hold a command for
                    if (retryAfter > MaxRetryAfter)
                    {
                        logger.Debug("Metadata source asked to wait {0}s, not retrying", retryAfter.TotalSeconds);
                        return response;
                    }

                    if (Wait(retryAfter, "returned 429", sleep, logger))
                    {
                        continue;
                    }

                    return response;
                }

                if (IsGatewayError(response.StatusCode) && gatewayRetries < MaxGatewayRetries)
                {
                    if (Wait(BackOff(++gatewayRetries), $"returned {(int)response.StatusCode}", sleep, logger))
                    {
                        continue;
                    }
                }

                return response;
            }
        }

        // A body that stalls after the headers is cancelled by the same timeout, but the dispatcher reports it as a
        // receive failure
        private static bool IsTimeout(WebException ex)
        {
            return ex.Status == WebExceptionStatus.Timeout ||
                   (ex.Status == WebExceptionStatus.ReceiveFailure && ex.InnerException is OperationCanceledException);
        }

        private static bool IsGatewayError(HttpStatusCode statusCode)
        {
            return statusCode == HttpStatusCode.BadGateway ||
                   statusCode == HttpStatusCode.ServiceUnavailable ||
                   statusCode == HttpStatusCode.GatewayTimeout;
        }

        // 1-2s, then 2-4s, jittered so concurrent commands don't retry in step
        private static TimeSpan BackOff(int retry)
        {
            return TimeSpan.FromSeconds(Math.Pow(2, retry - 1) * (1 + Random.Shared.NextDouble()));
        }

        private static TimeSpan RetryAfter(HttpResponse response)
        {
            var seconds = 5;

            if (response.Headers.ContainsKey("Retry-After") && (!int.TryParse(response.Headers["Retry-After"], out seconds) || seconds < 0))
            {
                seconds = 5;
            }

            return TimeSpan.FromSeconds(seconds);
        }

        private static bool Wait(TimeSpan delay, string reason, Action<TimeSpan> sleep, Logger logger)
        {
            if (!MetadataRetryBudget.TrySpend(delay))
            {
                logger.Debug("Metadata source {0}, not retrying: this command's retry budget is spent", reason);
                return false;
            }

            logger.Info("Metadata source {0}, retrying in {1:0.0}s", reason, delay.TotalSeconds);

            sleep(delay);
            return true;
        }
    }
}
