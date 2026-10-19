import Column from 'Components/Table/Column';
import translate from 'Utilities/String/translate';

// The missing and cutoff unmet tables share their columns and defaults.
export const getWantedColumns = (): Column[] => [
  {
    name: 'authorMetadata.sortName',
    label: () => translate('Author'),
    isSortable: true,
    isVisible: true,
  },
  {
    name: 'books.title',
    label: () => translate('Book'),
    isSortable: true,
    isVisible: true,
  },
  {
    name: 'releaseDate',
    label: () => translate('ReleaseDate'),
    isSortable: true,
    isVisible: true,
  },
  {
    name: 'books.lastSearchTime',
    label: () => translate('LastSearched'),
    isSortable: true,
    isVisible: false,
  },
  {
    name: 'actions',
    label: '',
    columnLabel: () => translate('Actions'),
    isVisible: true,
    isModifiable: false,
  },
];
