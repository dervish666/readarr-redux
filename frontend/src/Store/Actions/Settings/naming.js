import createFetchHandler from 'Store/Actions/Creators/createFetchHandler';
import { createThunk } from 'Store/thunks';

// Read-only feed until Stage 3: the organize (rename) preview reads
// state.settings.naming and fetches it when it opens. Settings > Media Management
// edits naming through react-query (Settings/MediaManagement/Naming/useNamingSettings)
// and copies every save into this section with `update`.

//
// Variables

const section = 'settings.naming';

//
// Actions Types

export const FETCH_NAMING_SETTINGS = 'settings/naming/fetchNamingSettings';

//
// Action Creators

export const fetchNamingSettings = createThunk(FETCH_NAMING_SETTINGS);

//
// Details

export default {

  //
  // State

  defaultState: {
    isFetching: false,
    isPopulated: false,
    error: null,
    item: {}
  },

  //
  // Action Handlers

  actionHandlers: {
    [FETCH_NAMING_SETTINGS]: createFetchHandler(section, '/config/naming')
  },

  //
  // Reducers

  reducers: {}
};
