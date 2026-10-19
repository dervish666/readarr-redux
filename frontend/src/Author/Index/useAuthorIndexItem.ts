import { useAuthor } from 'Author/useAuthors';
import * as commandNames from 'Commands/commandNames';
import { useCommandExecuting } from 'Commands/useCommands';
import { useMetadataProfile } from 'Settings/Profiles/Metadata/useMetadataProfiles';
import { useQualityProfile } from 'Settings/Profiles/Quality/useQualityProfiles';

// What a poster, overview or table row needs for one author.
const useAuthorIndexItem = (authorId: number) => {
  const author = useAuthor(authorId);
  const qualityProfile = useQualityProfile(author?.qualityProfileId);
  const metadataProfile = useMetadataProfile(author?.metadataProfileId);

  const isRefreshingAuthor = useCommandExecuting(commandNames.REFRESH_AUTHOR, {
    authorId,
  });

  const isSearchingAuthor = useCommandExecuting(commandNames.AUTHOR_SEARCH, {
    authorId,
  });

  return {
    author,
    qualityProfile,
    metadataProfile,
    isRefreshingAuthor,
    isSearchingAuthor,
  };
};

export default useAuthorIndexItem;
