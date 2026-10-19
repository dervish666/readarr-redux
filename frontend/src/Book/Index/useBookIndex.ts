import { useMemo } from 'react';
import useAuthors from 'Author/useAuthors';
import useBooks from 'Book/useBooks';
import useCustomFilters from 'Filters/useCustomFilters';
import clientSideFilterAndSort from 'Utilities/Filter/clientSideFilterAndSort';
import {
  createFilterPredicates,
  createSortPredicates,
  FILTERS,
} from './bookIndexFilters';
import { useBookIndexOptions } from './bookIndexOptionsStore';

// The custom filter type the index saves under. The redux index also listed filters
// saved as 'books'.
export const BOOK_INDEX_CUSTOM_FILTER_TYPE = 'bookIndex';
const CUSTOM_FILTER_TYPES = [BOOK_INDEX_CUSTOM_FILTER_TYPE, 'books'];

export const useBookIndexCustomFilters = () => {
  const { data } = useCustomFilters();

  return useMemo(
    () =>
      data
        .filter((customFilter) =>
          CUSTOM_FILTER_TYPES.includes(customFilter.type)
        )
        .sort((a, b) => a.label.localeCompare(b.label)),
    [data]
  );
};

// Every book filtered and sorted by the index options, as useAuthorIndex. The author
// list feeds the predicates that need the book's author.
const useBookIndex = () => {
  const {
    selectedFilterKey,
    sortKey,
    sortDirection,
    secondarySortKey,
    secondarySortDirection,
  } = useBookIndexOptions();

  const { data: books, ...queryResult } = useBooks();
  const {
    authorsMap,
    isFetched: isAuthorsFetched,
    isSuccess: isAuthorsSuccess,
  } = useAuthors();
  const customFilters = useBookIndexCustomFilters();

  const { data, totalItems } = useMemo(() => {
    return clientSideFilterAndSort(books, {
      selectedFilterKey,
      filters: FILTERS,
      filterPredicates: createFilterPredicates(authorsMap),
      customFilters,
      sortKey,
      sortDirection,
      secondarySortKey,
      secondarySortDirection,
      sortPredicates: createSortPredicates(authorsMap),
    });
  }, [
    books,
    authorsMap,
    customFilters,
    selectedFilterKey,
    sortKey,
    sortDirection,
    secondarySortKey,
    secondarySortDirection,
  ]);

  return {
    ...queryResult,
    // Rows and author filters need the author list too.
    isFetched: queryResult.isFetched && isAuthorsFetched,
    isSuccess: queryResult.isSuccess && isAuthorsSuccess,
    data,
    totalItems,
  };
};

export default useBookIndex;
