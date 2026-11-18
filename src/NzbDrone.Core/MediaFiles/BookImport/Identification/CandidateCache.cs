using System.Collections.Generic;
using NzbDrone.Common.Cache;
using NzbDrone.Core.Books;

namespace NzbDrone.Core.MediaFiles.BookImport.Identification
{
    // Owned by one identification batch, so later scans see changes to the library.
    public class CandidateCache
    {
        public ICached<List<Author>> Authors { get; } = new Cached<List<Author>>();
        public ICached<List<CandidateEdition>> Candidates { get; } = new Cached<List<CandidateEdition>>();
        public ICached<List<Edition>> Editions { get; } = new Cached<List<Edition>>();

        public void Trim()
        {
            if (Candidates.Count >= 512 || Editions.Count >= 2048 || Authors.Count >= 1024)
            {
                Candidates.Clear();
                Editions.Clear();
                Authors.Clear();
            }
        }
    }
}
