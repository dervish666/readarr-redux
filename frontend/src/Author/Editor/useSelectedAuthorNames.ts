import { useMemo } from 'react';
import Author from 'Author/Author';
import useAuthors from 'Author/useAuthors';

// The selected authors' names in sort name order, for the editor's confirm modals.
function useSelectedAuthorNames(authorIds: number[]) {
  const { authorsMap } = useAuthors();

  return useMemo(() => {
    return authorIds
      .map((id) => authorsMap.get(id))
      .filter((author): author is Author => !!author)
      .sort((a, b) => a.sortName.localeCompare(b.sortName))
      .map((author) => author.authorName);
  }, [authorIds, authorsMap]);
}

export default useSelectedAuthorNames;
