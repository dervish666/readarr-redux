import Column from 'Components/Table/Column';
import { createOptionsStore } from 'Helpers/Hooks/useOptionsStore';
import SortDirection from 'Helpers/Props/SortDirection';
import translate from 'Utilities/String/translate';

// The author index view settings, persisted as <instance>_author_index_options.
// Defaults are the old redux authorIndex ones; saved redux settings are not carried over.

export type AuthorIndexView = 'posters' | 'overview' | 'table';
export type PosterSize = 'small' | 'medium' | 'large';
export type NameStyle = 'firstLast' | 'lastFirst';

export interface AuthorIndexPosterOptions {
  detailedProgressBar: boolean;
  size: PosterSize;
  showTitle: NameStyle | 'no';
  showMonitored: boolean;
  showQualityProfile: boolean;
  showSearchAction: boolean;
}

export interface AuthorIndexOverviewOptions {
  showTitle: NameStyle;
  detailedProgressBar: boolean;
  size: PosterSize;
  showMonitored: boolean;
  showQualityProfile: boolean;
  showLastBook: boolean;
  showAdded: boolean;
  showBookCount: boolean;
  showPath: boolean;
  showSizeOnDisk: boolean;
  showSearchAction: boolean;
}

export interface AuthorIndexTableOptions {
  showTitle: NameStyle;
  showBanners: boolean;
  showSearchAction: boolean;
}

export interface AuthorIndexOptions {
  selectedFilterKey: string | number;
  sortKey: string;
  sortDirection: SortDirection;
  secondarySortKey: string;
  secondarySortDirection: SortDirection;
  view: AuthorIndexView;
  columns: Column[];
  posterOptions: AuthorIndexPosterOptions;
  overviewOptions: AuthorIndexOverviewOptions;
  tableOptions: AuthorIndexTableOptions;
}

const { store, useOptions, useOption, setOptions, setOption, setSort } =
  createOptionsStore<AuthorIndexOptions>('author_index_options', () => {
    return {
      selectedFilterKey: 'all',
      sortKey: 'sortNameLastFirst',
      sortDirection: SortDirection.Ascending,
      secondarySortKey: 'sortNameLastFirst',
      secondarySortDirection: SortDirection.Ascending,
      view: 'posters',

      posterOptions: {
        detailedProgressBar: false,
        size: 'large',
        showTitle: 'lastFirst',
        showMonitored: true,
        showQualityProfile: true,
        showSearchAction: false,
      },

      overviewOptions: {
        showTitle: 'lastFirst',
        detailedProgressBar: false,
        size: 'medium',
        showMonitored: true,
        showQualityProfile: true,
        showLastBook: false,
        showAdded: false,
        showBookCount: true,
        showPath: false,
        showSizeOnDisk: false,
        showSearchAction: false,
      },

      tableOptions: {
        showTitle: 'lastFirst',
        showBanners: false,
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
          name: 'sortName',
          label: () => translate('AuthorName'),
          isSortable: true,
          isVisible: true,
          isModifiable: false,
        },
        {
          name: 'qualityProfileId',
          label: () => translate('QualityProfile'),
          isSortable: true,
          isVisible: true,
        },
        {
          name: 'metadataProfileId',
          label: () => translate('MetadataProfile'),
          isSortable: true,
          isVisible: false,
        },
        {
          name: 'nextBook',
          label: () => translate('NextBook'),
          isSortable: true,
          isVisible: true,
        },
        {
          name: 'lastBook',
          label: () => translate('LastBook'),
          isSortable: true,
          isVisible: false,
        },
        {
          name: 'added',
          label: () => translate('Added'),
          isSortable: true,
          isVisible: false,
        },
        {
          name: 'bookProgress',
          label: () => translate('Books'),
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

export const authorIndexOptionsStore = store;
export const useAuthorIndexOptions = useOptions;
export const useAuthorIndexOption = useOption;
export const setAuthorIndexOptions = setOptions;
export const setAuthorIndexOption = setOption;
export const setAuthorIndexSort = setSort;

export const useAuthorIndexPosterOptions = () => useOption('posterOptions');

export const useAuthorIndexOverviewOptions = () => useOption('overviewOptions');

export const useAuthorIndexTableOptions = () => useOption('tableOptions');

export const setAuthorIndexPosterOptions = (
  options: Partial<AuthorIndexPosterOptions>
) => {
  store.setState((state) => ({
    posterOptions: { ...state.posterOptions, ...options },
  }));
};

export const setAuthorIndexOverviewOptions = (
  options: Partial<AuthorIndexOverviewOptions>
) => {
  store.setState((state) => ({
    overviewOptions: { ...state.overviewOptions, ...options },
  }));
};

export const setAuthorIndexTableOptions = (
  options: Partial<AuthorIndexTableOptions>
) => {
  store.setState((state) => ({
    tableOptions: { ...state.tableOptions, ...options },
  }));
};

// The search action follows the current view's options.
export const useAuthorIndexShowSearchAction = () => {
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
