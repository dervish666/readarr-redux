using System.Linq;
using NzbDrone.Core.Datastore;
using NzbDrone.Core.Messaging.Events;

namespace NzbDrone.Core.Http
{
    public interface ICachedHttpResponseRepository : IBasicRepository<CachedHttpResponse>
    {
        CachedHttpResponse FindByUrl(string url);
    }

    public class CachedHttpResponseRepository : BasicRepository<CachedHttpResponse>, ICachedHttpResponseRepository
    {
        public CachedHttpResponseRepository(ICacheDatabase database,
                                            IEventAggregator eventAggregator)
            : base(database, eventAggregator)
        {
        }

        public CachedHttpResponse FindByUrl(string url)
        {
            // Migration 046 made Url unique, but take the newest row rather than throw should a duplicate get in again
            return Query(x => x.Url == url)
                .OrderByDescending(x => x.LastRefresh)
                .ThenByDescending(x => x.Id)
                .FirstOrDefault();
        }
    }
}
