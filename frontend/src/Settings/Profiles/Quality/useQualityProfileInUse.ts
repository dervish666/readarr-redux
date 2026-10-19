import useAuthors from 'Author/useAuthors';
import { useImportListsData } from 'Settings/ImportLists/ImportLists/useImportLists';

function useQualityProfileInUse(id: number | undefined) {
  const { data: authors } = useAuthors();
  const importLists = useImportListsData();

  return (
    !!id &&
    (authors.some((author) => author.qualityProfileId === id) ||
      importLists.some((list) => list.qualityProfileId === id))
  );
}

export default useQualityProfileInUse;
