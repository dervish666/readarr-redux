import Column from 'Components/Table/Column';
import { createOptionsStore } from 'Helpers/Hooks/useOptionsStore';
import SortDirection from 'Helpers/Props/SortDirection';
import translate from 'Utilities/String/translate';

// The book index view settings, persisted as <instance>_book_index_options.
// Defaults are the old redux bookIndex ones; saved redux settings are not carried over.
// The overview and table options were read from authorIndex in redux; the book index
// has its own now.

export type BookIndexView = 'posters' | 'overview' | 'table';
export type PosterSize = 'small' | 'medium' | 'large';

export interface BookIndexPosterOptions {
  detailedProgressBar: boolean;
  size: PosterSize;
  showTitle: boolean;
  showAuthor: boolean;
  showMonitored: boolean;
  showQualityProfile: boolean;
  showSearchAction: boolean;
}

export interface BookIndexOverviewOptions {
  detailedProgressBar: boolean;
  size: PosterSize;
  showReleaseDate: boolean;
  showMonitored: boolean;
  showQualityProfile: boolean;
  showAdded: boolean;
  showPath: boolean;
  showSizeOnDisk: boolean;
  showSearchAction: boolean;
}

export interface BookIndexTableOptions {
  showSearchAction: boolean;
}

export interface BookIndexOptions {
  selectedFilterKey: string | number;
  sortKey: string;
  sortDirection: SortDirection;
  secondarySortKey: string;
  secondarySortDirection: SortDirection;
  view: BookIndexView;
  columns: Column[];
  posterOptions: BookIndexPosterOptions;
  overviewOptions: BookIndexOverviewOptions;
  tableOptions: BookIndexTableOptions;
}

const { store, useOptions, useOption, setOptions, setOption, setSort } =
  createOptionsStore<BookIndexOptions>('book_index_options', () => {
    return {
      selectedFilterKey: 'all',
      sortKey: 'title',
      sortDirection: SortDirection.Ascending,
      secondarySortKey: 'title',
      secondarySortDirection: SortDirection.Ascending,
      view: 'posters',

      posterOptions: {
        detailedProgressBar: false,
        size: 'large',
        showTitle: true,
        showAuthor: true,
        showMonitored: true,
        showQualityProfile: true,
        showSearchAction: false,
      },

      overviewOptions: {
        detailedProgressBar: false,
        size: 'medium',
        showReleaseDate: true,
        showMonitored: true,
        showQualityProfile: true,
        showAdded: false,
        showPath: false,
        showSizeOnDisk: false,
        showSearchAction: false,
      },

      tableOptions: {
        showSearchAction: false,
      },

      columns: [
        {
          name: 'select',
          label: '',
          columnLabel: () => translate('Select'),
          isSortable: false,
          isVisible: true,
          isModifiable: false,
        },
        {
          name: 'status',
          label: '',
          columnLabel: () => translate('Status'),
          isSortable: true,
          isVisible: true,
          isModifiable: false,
        },
        {
          name: 'title',
          label: () => translate('Book'),
          isSortable: true,
          isVisible: true,
          isModifiable: false,
        },
        {
          name: 'authorName',
          label: () => translate('Author'),
          isSortable: true,
          isVisible: true,
          isModifiable: true,
        },
        {
          name: 'releaseDate',
          label: () => translate('ReleaseDate'),
          isSortable: true,
          isVisible: false,
        },
        {
          name: 'qualityProfileId',
          label: () => translate('QualityProfile'),
          isSortable: true,
          isVisible: true,
        },
        {
          name: 'added',
          label: () => translate('Added'),
          isSortable: true,
          isVisible: false,
        },
        {
          name: 'bookFileCount',
          label: () => translate('FileCount'),
          isSortable: true,
          isVisible: true,
        },
        {
          name: 'path',
          label: () => translate('Path'),
          isSortable: true,
          isVisible: false,
        },
        {
          name: 'sizeOnDisk',
          label: () => translate('SizeOnDisk'),
          isSortable: true,
          isVisible: false,
        },
        {
          name: 'genres',
          label: () => translate('Genres'),
          isSortable: false,
          isVisible: false,
        },
        {
          name: 'ratings',
          label: () => translate('Rating'),
          isSortable: true,
          isVisible: false,
        },
        {
          name: 'tags',
          label: () => translate('Tags'),
          isSortable: false,
          isVisible: false,
        },
        {
          name: 'actions',
          label: '',
          columnLabel: () => translate('Actions'),
          isVisible: true,
          isModifiable: false,
        },
      ],
    };
  });

export const bookIndexOptionsStore = store;
export const useBookIndexOptions = useOptions;
export const useBookIndexOption = useOption;
export const setBookIndexOptions = setOptions;
export const setBookIndexOption = setOption;
export const setBookIndexSort = setSort;

export const useBookIndexPosterOptions = () => useOption('posterOptions');

export const useBookIndexOverviewOptions = () => useOption('overviewOptions');

export const useBookIndexTableOptions = () => useOption('tableOptions');

export const setBookIndexPosterOptions = (
  options: Partial<BookIndexPosterOptions>
) => {
  store.setState((state) => ({
    posterOptions: { ...state.posterOptions, ...options },
  }));
};

export const setBookIndexOverviewOptions = (
  options: Partial<BookIndexOverviewOptions>
) => {
  store.setState((state) => ({
    overviewOptions: { ...state.overviewOptions, ...options },
  }));
};

export const setBookIndexTableOptions = (
  options: Partial<BookIndexTableOptions>
) => {
  store.setState((state) => ({
    tableOptions: { ...state.tableOptions, ...options },
  }));
};

// The search action follows the current view's options.
export const useBookIndexShowSearchAction = () => {
  return store((state) => {
    switch (state.view) {
      case 'posters':
        return state.posterOptions.showSearchAction;
      case 'overview':
        return state.overviewOptions.showSearchAction;
      default:
        return state.tableOptions.showSearchAction;
    }
  });
};
