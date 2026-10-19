import createFetchHandler from 'Store/Actions/Creators/createFetchHandler';
import { createThunk } from 'Store/thunks';

// Read-only feed until Stage 3: add-new, the author editor, import lists and remote
// path mappings still read state.settings.rootFolders. Settings > Media Management's
// root folders, the root folder select input and SignalR use react-query
// (RootFolder/useRootFolders) and dispatch fetchRootFolders after every change.

//
// Variables

export const section = 'settings.rootFolders';

//
// Actions Types

export const FETCH_ROOT_FOLDERS = 'settings/rootFolders/fetchRootFolders';

//
// Action Creators

export const fetchRootFolders = createThunk(FETCH_ROOT_FOLDERS);

//
// Details

export default {

  //
  // State

  defaultState: {
    isFetching: false,
    isPopulated: false,
    error: null,
    items: []
  },

  //
  // Action Handlers

  actionHandlers: {
    [FETCH_ROOT_FOLDERS]: createFetchHandler(section, '/rootFolder')
  },

  //
  // Reducers

  reducers: {}
};
