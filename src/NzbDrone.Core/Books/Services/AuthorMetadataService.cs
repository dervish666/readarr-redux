using System.Collections.Generic;

namespace NzbDrone.Core.Books
{
    public interface IAuthorMetadataService
    {
        bool Upsert(AuthorMetadata author);
        bool UpsertMany(List<AuthorMetadata> authors);
        void Update(AuthorMetadata author);
    }

    public class AuthorMetadataService : IAuthorMetadataService
    {
        private readonly IAuthorMetadataRepository _authorMetadataRepository;

        public AuthorMetadataService(IAuthorMetadataRepository authorMetadataRepository)
        {
            _authorMetadataRepository = authorMetadataRepository;
        }

        public bool Upsert(AuthorMetadata author)
        {
            return _authorMetadataRepository.UpsertMany(new List<AuthorMetadata> { author });
        }

        public bool UpsertMany(List<AuthorMetadata> authors)
        {
            return _authorMetadataRepository.UpsertMany(authors);
        }

        // Saves the user's edits as they are. UpsertMany would take the stored overrides over the new ones.
        public void Update(AuthorMetadata author)
        {
            _authorMetadataRepository.Update(author);
        }
    }
}
