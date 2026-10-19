import { useMemo } from 'react';
import Author from 'Author/Author';
import useAuthors, {
  FILTER_PREDICATES,
  FILTERS,
  SORT_PREDICATES,
} from 'Author/useAuthors';
import Book from 'Book/Book';
import useBooks from 'Book/useBooks';
import { FilterBuilderProp } from 'Filters/Filter';
import { useCustomFiltersList } from 'Filters/useCustomFilters';
import { filterBuilderTypes, filterBuilderValueTypes } from 'Helpers/Props';
import clientSideFilterAndSort from 'Utilities/Filter/clientSideFilterAndSort';
import translate from 'Utilities/String/translate';
import { useBookshelfOptions } from './bookshelfOptionsStore';

export const BOOKSHELF_CUSTOM_FILTER_TYPE = 'bookshelf';

// The redux bookshelf's filter builder: the author index's filters, fewer fields.
export const BOOKSHELF_FILTER_BUILDER: FilterBuilderProp<Author>[] = [
  {
    name: 'monitored',
    label: () => translate('Monitored'),
    type: filterBuilderTypes.EXACT,
    valueType: filterBuilderValueTypes.BOOL,
  },
  {
    name: 'status',
    label: () => translate('Status'),
    type: filterBuilderTypes.EXACT,
    valueType: filterBuilderValueTypes.AUTHOR_STATUS,
  },
  {
    name: 'qualityProfileId',
    label: () => translate('QualityProfile'),
    type: filterBuilderTypes.EXACT,
    valueType: filterBuilderValueTypes.QUALITY_PROFILE,
  },
  {
    name: 'metadataProfileId',
    label: () => translate('MetadataProfile'),
    type: filterBuilderTypes.EXACT,
    valueType: filterBuilderValueTypes.METADATA_PROFILE,
  },
  {
    name: 'rootFolderPath',
    label: () => translate('RootFolderPath'),
    type: filterBuilderTypes.EXACT,
  },
  {
    name: 'tags',
    label: () => translate('Tags'),
    type: filterBuilderTypes.ARRAY,
    valueType: filterBuilderValueTypes.TAG,
  },
];

// Authors filtered and sorted by the bookshelf options, and every book grouped by
// author, newest first (the redux row's order).
const useBookshelf = () => {
  const {
    selectedFilterKey,
    sortKey,
    sortDirection,
    secondarySortKey,
    secondarySortDirection,
  } = useBookshelfOptions();

  const { data: authors, ...authorsQuery } = useAuthors();
  const { data: books, ...booksQuery } = useBooks();
  const customFilters = useCustomFiltersList(BOOKSHELF_CUSTOM_FILTER_TYPE);

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

  const booksByAuthor = useMemo(() => {
    const map = new Map<number, Book[]>();

    books.forEach((book) => {
      const authorBooks = map.get(book.authorId);

      if (authorBooks) {
        authorBooks.push(book);
      } else {
        map.set(book.authorId, [book]);
      }
    });

    map.forEach((authorBooks) => {
      authorBooks.sort((a, b) =>
        (b.releaseDate ?? '').localeCompare(a.releaseDate ?? '')
      );
    });

    return map;
  }, [books]);

  return {
    items: data,
    totalItems,
    customFilters,
    bookCount: books.length,
    booksByAuthor,
    isLoading: authorsQuery.isLoading || booksQuery.isLoading,
    // Both lists must load; a failed load must not show an empty shelf.
    isFetched: authorsQuery.isFetched && booksQuery.isFetched,
    isSuccess: authorsQuery.isSuccess && booksQuery.isSuccess,
    error: authorsQuery.error ?? booksQuery.error,
  };
};

export default useBookshelf;
