// Upstream initialised Sentry here and sent browser errors, with the whole
// Redux store attached, to sentry.servarr.com. The fork sends no crash
// reports, so no Sentry client is created and no middleware is installed.
export default function createSentryMiddleware() {
  return undefined;
}
