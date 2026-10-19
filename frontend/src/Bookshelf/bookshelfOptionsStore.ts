import { createOptionsStore } from 'Helpers/Hooks/useOptionsStore';
import SortDirection from 'Helpers/Props/SortDirection';

// The bookshelf's sort and filter, persisted as <instance>_bookshelf_options.
// Defaults are the old redux bookshelf ones; saved redux settings are not carried over.

export interface BookshelfOptions {
  selectedFilterKey: string | number;
  sortKey: string;
  sortDirection: SortDirection;
  secondarySortKey: string;
  secondarySortDirection: SortDirection;
}

const { store, useOptions, setOption, setSort } =
  createOptionsStore<BookshelfOptions>('bookshelf_options', () => {
    return {
      selectedFilterKey: 'all',
      sortKey: 'sortName',
      sortDirection: SortDirection.Ascending,
      secondarySortKey: 'sortName',
      secondarySortDirection: SortDirection.Ascending,
    };
  });

export const bookshelfOptionsStore = store;
export const useBookshelfOptions = useOptions;
export const setBookshelfOption = setOption;
export const setBookshelfSort = setSort;
