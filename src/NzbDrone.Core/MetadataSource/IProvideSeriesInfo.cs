using NzbDrone.Core.MetadataSource.BookInfo;

namespace NzbDrone.Core.MetadataSource
{
    public interface IProvideSeriesInfo
    {
        SeriesResource GetSeriesInfo(long id, bool useCache = true);
    }
}
