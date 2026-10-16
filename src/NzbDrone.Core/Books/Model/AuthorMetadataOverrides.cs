using Equ;
using NzbDrone.Common.Extensions;
using NzbDrone.Core.Datastore;

namespace NzbDrone.Core.Books
{
    // What the user set on an author by hand, written over the metadata source's values on every refresh
    public class AuthorMetadataOverrides : MemberwiseEquatable<AuthorMetadataOverrides>, IEmbeddedDocument
    {
        public string Overview { get; set; }

        public bool IsEmpty => Overview.IsNullOrWhiteSpace();

        public void ApplyTo(AuthorMetadata metadata)
        {
            if (Overview.IsNotNullOrWhiteSpace())
            {
                metadata.Overview = Overview;
            }
        }
    }
}
