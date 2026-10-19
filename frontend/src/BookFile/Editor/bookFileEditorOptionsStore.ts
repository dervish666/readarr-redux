import Column from 'Components/Table/Column';
import { createOptionsStore } from 'Helpers/Hooks/useOptionsStore';
import SortDirection from 'Helpers/Props/SortDirection';
import translate from 'Utilities/String/translate';

// The Files tab of the author and book pages (<instance>_book_file_editor_options).
// Defaults are the old redux bookFiles ones (path ascending); saved redux settings are
// not carried over.

export interface BookFileEditorOptions {
  columns: Column[];
  selectedFilterKey: string;
  sortKey: string;
  sortDirection: SortDirection;
}

export const bookFileEditorOptions = createOptionsStore<BookFileEditorOptions>(
  'book_file_editor_options',
  () => {
    return {
      selectedFilterKey: 'all',
      sortKey: 'path',
      sortDirection: SortDirection.Ascending,
      // The select column is the Table's own selectAll header; the redux list also
      // had a 'select' column, which drew an extra empty header cell.
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
