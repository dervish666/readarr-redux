using System;
using System.Collections.Generic;
using NzbDrone.Core.Books;

namespace NzbDrone.Core.MetadataSource
{
    public interface IProvideAuthorInfo
    {
        Author GetAuthorInfo(string readarrId, bool useCache = true);
        HashSet<string> GetChangedAuthors(DateTime startTime);

        // Drops the author's cached payload, so the next refresh reads the metadata source's values again
        void EvictAuthor(string foreignAuthorId);
    }
}
