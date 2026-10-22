using NLog;
using NLog.Layouts;

namespace NzbDrone.Common.Instrumentation
{
    // The console ends up in `docker logs` and the Unraid log viewer, so it gets the same cleansing as the log files
    public class CleansingLayout : Layout
    {
        private readonly Layout _inner;

        public CleansingLayout(string layout)
        {
            _inner = Layout.FromString(layout);
        }

        protected override string GetFormattedMessage(LogEventInfo logEvent)
        {
            return CleanseLogMessage.Cleanse(_inner.Render(logEvent));
        }
    }
}
