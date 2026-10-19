import { useMemo } from 'react';
import useAuthors, {
  FILTER_PREDICATES,
  FILTERS,
  SORT_PREDICATES,
} from 'Author/useAuthors';
import { useCustomFiltersList } from 'Filters/useCustomFilters';
import clientSideFilterAndSort from 'Utilities/Filter/clientSideFilterAndSort';
import { useAuthorIndexOptions } from './authorIndexOptionsStore';

// The custom filter type the index has always saved under.
export const AUTHOR_INDEX_CUSTOM_FILTER_TYPE = 'authorIndex';

// The author list filtered and sorted by the index options, as Sonarr's useSeriesIndex.
const useAuthorIndex = () => {
  const {
    selectedFilterKey,
    sortKey,
    sortDirection,
    secondarySortKey,
    secondarySortDirection,
  } = useAuthorIndexOptions();

  const { data: authors, ...queryResult } = useAuthors();
  const customFilters = useCustomFiltersList(AUTHOR_INDEX_CUSTOM_FILTER_TYPE);

  const { data, totalItems } = useMemo(() => {
    return clientSideFilterAndSort(authors, {
      selectedFilterKey,
      filters: FILTERS,
      filterPredicates: FILTER_PREDICATES,
      customFilters,
      sortKey,
      sortDirection,
      secondarySortKey,
      secondarySortDirection,
      sortPredicates: SORT_PREDICATES,
    });
  }, [
    authors,
    customFilters,
    selectedFilterKey,
    sortKey,
    sortDirection,
    secondarySortKey,
    secondarySortDirection,
  ]);

  return {
    ...queryResult,
    data,
    totalItems,
  };
};

export default useAuthorIndex;
