import { useSelector } from 'react-redux';
import Author from 'Author/Author';
import { useImportListsData } from 'Settings/ImportLists/ImportLists/useImportLists';

// Authors are still a redux feed; import lists are on react-query.
interface ProfileInUseState {
  authors: { items: Author[] };
}

function useQualityProfileInUse(id: number | undefined) {
  const importLists = useImportListsData();

  const usedByAuthor = useSelector((state: ProfileInUseState) => {
    return !!id && state.authors.items.some((a) => a.qualityProfileId === id);
  });

  return (
    usedByAuthor ||
    (!!id && importLists.some((list) => list.qualityProfileId === id))
  );
}

export default useQualityProfileInUse;
