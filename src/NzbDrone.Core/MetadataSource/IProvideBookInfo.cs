using System;
using System.Collections.Generic;
using NzbDrone.Core.Books;

namespace NzbDrone.Core.MetadataSource
{
    public interface IProvideBookInfo
    {
        Tuple<string, Book, List<AuthorMetadata>> GetBookInfo(string id);

        // The work an edition belongs to now. Throws EditionNotFoundException only when the edition itself is gone.
        string GetWorkIdForEdition(string foreignEditionId);
    }
}
