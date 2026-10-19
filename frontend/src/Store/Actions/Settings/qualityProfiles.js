import createFetchHandler from 'Store/Actions/Creators/createFetchHandler';
import createFetchSchemaHandler from 'Store/Actions/Creators/createFetchSchemaHandler';
import { createThunk } from 'Store/thunks';

// Read-only feed. Settings > Profiles edits quality profiles through react-query
// (Settings/Profiles/Quality/useQualityProfiles.ts) and dispatches fetchQualityProfiles
// after every change, because author, book, add-new and import list pages and the
// profile select inputs still read state.settings.qualityProfiles. The schema is read
// by the quality filter builder, interactive import and the book file editor.

//
// Variables

const section = 'settings.qualityProfiles';

//
// Actions Types

export const FETCH_QUALITY_PROFILES = 'settings/qualityProfiles/fetchQualityProfiles';
export const FETCH_QUALITY_PROFILE_SCHEMA = 'settings/qualityProfiles/fetchQualityProfileSchema';

//
// Action Creators

export const fetchQualityProfiles = createThunk(FETCH_QUALITY_PROFILES);
export const fetchQualityProfileSchema = createThunk(FETCH_QUALITY_PROFILE_SCHEMA);

//
// Details

export default {

  //
  // State

  defaultState: {
    isFetching: false,
    isPopulated: false,
    error: null,
    isSchemaFetching: false,
    isSchemaPopulated: false,
    schemaError: null,
    schema: {},
    items: []
  },

  //
  // Action Handlers

  actionHandlers: {
    [FETCH_QUALITY_PROFILES]: createFetchHandler(section, '/qualityprofile'),
    [FETCH_QUALITY_PROFILE_SCHEMA]: createFetchSchemaHandler(section, '/qualityprofile/schema')
  },

  //
  // Reducers

  reducers: {}

};
