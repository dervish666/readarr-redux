import { createOptionsStore } from 'Helpers/Hooks/useOptionsStore';
import SortDirection from 'Helpers/Props/SortDirection';
import { ImportMode } from './InteractiveImport';

// Sort and import mode of the manual import modal (the redux slice persisted the
// same three values).

export interface InteractiveImportOptions {
  sortKey: string;
  sortDirection: SortDirection;
  importMode: ImportMode;
}

export const interactiveImportOptions =
  createOptionsStore<InteractiveImportOptions>(
    'interactive_import_options',
    () => {
      return {
        sortKey: 'path',
        sortDirection: SortDirection.Ascending,
        importMode: 'chooseImportMode',
      };
    }
  );

export const useInteractiveImportOptions = interactiveImportOptions.useOptions;
export const setInteractiveImportOption = interactiveImportOptions.setOption;
export const setInteractiveImportSort = interactiveImportOptions.setSort;
