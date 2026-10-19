import createFetchHandler from 'Store/Actions/Creators/createFetchHandler';
import { createThunk } from 'Store/thunks';

// Read-only feed: interactive search and the relative date cells read
// state.settings.ui (via createUISettingsSelector). Settings > UI, the calendar, the
// theme and the converted pages use react-query (Settings/UI/useUiSettings); every
// save copies the saved settings into this section with `update`.

//
// Variables

const section = 'settings.ui';

//
// Actions Types

export const FETCH_UI_SETTINGS = 'settings/ui/fetchUiSettings';

//
// Action Creators

export const fetchUISettings = createThunk(FETCH_UI_SETTINGS);

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
    [FETCH_UI_SETTINGS]: createFetchHandler(section, '/config/ui')
  },

  //
  // Reducers

  reducers: {}
};
