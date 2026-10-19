import createFetchHandler from 'Store/Actions/Creators/createFetchHandler';
import { createThunk } from 'Store/thunks';

// Read-only feed. Settings > Profiles edits metadata profiles through react-query
// (Settings/Profiles/Metadata/useMetadataProfiles.ts) and dispatches this fetch after
// every change, because author, book, add-new and import list pages still read
// state.settings.metadataProfiles.

//
// Variables

const section = 'settings.metadataProfiles';

//
// Actions Types

export const FETCH_METADATA_PROFILES = 'settings/metadataProfiles/fetchMetadataProfiles';

//
// Action Creators

export const fetchMetadataProfiles = createThunk(FETCH_METADATA_PROFILES);

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
    [FETCH_METADATA_PROFILES]: createFetchHandler(section, '/metadataprofile')
  },

  //
  // Reducers

  reducers: {}

};
