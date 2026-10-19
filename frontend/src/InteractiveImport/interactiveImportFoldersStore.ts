import moment from 'moment';
import { createPersist } from 'Helpers/createPersist';

// The manual import folder picker's recent folders (newest last, at most 10), as the
// redux interactiveImport.recentFolders kept them.

const MAXIMUM_RECENT_FOLDERS = 10;

export interface RecentFolder {
  folder: string;
  lastUsed: string;
}

interface InteractiveImportFoldersState {
  recentFolders: RecentFolder[];
}

const store = createPersist<InteractiveImportFoldersState>(
  'interactive_import_folders',
  () => ({
    recentFolders: [],
  })
);

export const useRecentFolders = () => {
  return store((state) => state.recentFolders);
};

export const addRecentFolder = (folder: string) => {
  store.setState((state) => {
    const recentFolders = state.recentFolders.filter(
      (r) => r.folder !== folder
    );

    recentFolders.push({ folder, lastUsed: moment().toISOString() });

    const sliceIndex = Math.max(
      recentFolders.length - MAXIMUM_RECENT_FOLDERS,
      0
    );

    return {
      ...state,
      recentFolders: recentFolders.slice(sliceIndex),
    };
  });
};

export const removeRecentFolder = (folder: string) => {
  store.setState((state) => {
    return {
      ...state,
      recentFolders: state.recentFolders.filter((r) => r.folder !== folder),
    };
  });
};
