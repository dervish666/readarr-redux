import Column from 'Components/Table/Column';
import { createOptionsStore } from 'Helpers/Hooks/useOptionsStore';
import SortDirection from 'Helpers/Props/SortDirection';
import translate from 'Utilities/String/translate';

// The unmapped files page (<instance>_unmapped_files_options). Defaults are the redux
// bookFiles ones (path ascending); saved redux settings are not carried over.

export interface UnmappedFilesOptions {
  columns: Column[];
  selectedFilterKey: string;
  sortKey: string;
  sortDirection: SortDirection;
}

export const unmappedFilesOptions = createOptionsStore<UnmappedFilesOptions>(
  'unmapped_files_options',
  () => {
    return {
      selectedFilterKey: 'all',
      sortKey: 'path',
      sortDirection: SortDirection.Ascending,
      // Selection is the Table's own select-all header, not a column.
      columns: [
        {
          name: 'path',
          label: () => translate('Path'),
          isSortable: true,
          isVisible: true,
          isModifiable: false,
        },
        {
          name: 'size',
          label: () => translate('Size'),
          isSortable: true,
          isVisible: true,
        },
        {
          name: 'dateAdded',
          label: () => translate('DateAdded'),
          isSortable: true,
          isVisible: true,
        },
        {
          name: 'quality',
          label: () => translate('Quality'),
          isSortable: true,
          isVisible: true,
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
  }
);

export const useUnmappedFilesOptions = unmappedFilesOptions.useOptions;
export const setUnmappedFilesOption = unmappedFilesOptions.setOption;
export const setUnmappedFilesSort = unmappedFilesOptions.setSort;
