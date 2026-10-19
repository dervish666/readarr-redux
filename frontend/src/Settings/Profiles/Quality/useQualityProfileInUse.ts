import { useSelector } from 'react-redux';
import Author from 'Author/Author';
import ImportList from 'typings/ImportList';

// Authors and import lists are still redux feeds.
interface ProfileInUseState {
  authors: { items: Author[] };
  settings: { importLists: { items: ImportList[] } };
}

// The quality profile half of Store/Selectors/createProfileInUseSelector.
function useQualityProfileInUse(id: number | undefined) {
  return useSelector((state: ProfileInUseState) => {
    if (!id) {
      return false;
    }

    return (
      state.authors.items.some((author) => author.qualityProfileId === id) ||
      state.settings.importLists.items.some(
        (list) => list.qualityProfileId === id
      )
    );
  });
}

export default useQualityProfileInUse;
