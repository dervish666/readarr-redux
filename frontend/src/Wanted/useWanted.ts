import { useMemo } from 'react';
import Book from 'Book/Book';
import { PageableOptions } from 'Helpers/Hooks/useOptionsStore';
import usePage from 'Helpers/Hooks/usePage';
import usePagedApiQuery from 'Helpers/Hooks/usePagedApiQuery';
import { getWantedFilters } from './wantedFilters';

export type WantedPath = '/wanted/missing' | '/wanted/cutoff';

// One page of GET /wanted/missing or /wanted/cutoff, keyed [path, params, page, ...].
// Rows carry their author (includeAuthor), so they don't wait on the author list.
const useWanted = (
  path: WantedPath,
  pageKey: 'missing' | 'cutoffUnmet',
  options: PageableOptions
) => {
  const { page, goToPage } = usePage(pageKey);
  const { pageSize, selectedFilterKey, sortKey, sortDirection } = options;

  const filters = useMemo(() => {
    return getWantedFilters(selectedFilterKey);
  }, [selectedFilterKey]);

  const query = usePagedApiQuery<Book>({
    path,
    page,
    pageSize,
    filters,
    sortKey,
    sortDirection,
    queryParams: {
      includeAuthor: true,
    },
  });

  return {
    ...query,
    page,
    goToPage,
  };
};

export default useWanted;
