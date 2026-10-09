import { createAction } from 'redux-actions';
import { batchActions } from 'redux-batched-actions';
import createFetchHandler from 'Store/Actions/Creators/createFetchHandler';
import createSetSettingValueReducer from 'Store/Actions/Creators/Reducers/createSetSettingValueReducer';
import { createThunk } from 'Store/thunks';
import createAjaxRequest from 'Utilities/createAjaxRequest';
import getSectionState from 'Utilities/State/getSectionState';
import updateSectionState from 'Utilities/State/updateSectionState';
import { set, update } from '../baseActions';

//
// Variables

const section = 'settings.metadataSource';
const url = '/config/metadatasource';

//
// Actions Types

export const FETCH_METADATA_SOURCE_SETTINGS = 'settings/metadataSource/fetchMetadataSourceSettings';
export const SET_METADATA_SOURCE_SETTINGS_VALUE = 'settings/metadataSource/setMetadataSourceSettingsValue';
export const SAVE_METADATA_SOURCE_SETTINGS = 'settings/metadataSource/saveMetadataSourceSettings';
export const TEST_METADATA_SOURCE = 'settings/metadataSource/testMetadataSource';

//
// Action Creators

export const fetchMetadataSourceSettings = createThunk(FETCH_METADATA_SOURCE_SETTINGS);
export const saveMetadataSourceSettings = createThunk(SAVE_METADATA_SOURCE_SETTINGS);
export const testMetadataSource = createThunk(TEST_METADATA_SOURCE);
export const setMetadataSourceSettingsValue = createAction(SET_METADATA_SOURCE_SETTINGS_VALUE, (payload) => {
  return {
    section,
    ...payload
  };
});

function getMetadataSource(getState) {
  const state = getSectionState(getState(), section, true);

  return Object.assign({}, state.item, state.pendingChanges).metadataSource;
}

//
// Details

export default {

  //
  // State

  defaultState: {
    isFetching: false,
    isPopulated: false,
    error: null,
    pendingChanges: {},
    isSaving: false,
    saveError: null,
    isTesting: false,
    testError: null,
    probe: null,
    probeFromSave: false,
    item: {}
  },

  //
  // Action Handlers

  actionHandlers: {
    [FETCH_METADATA_SOURCE_SETTINGS]: createFetchHandler(section, url),

    // The server saves whatever the probe says and returns the probe alongside, so a failing source is a warning
    // shown after the save rather than an error that blocks it
    [SAVE_METADATA_SOURCE_SETTINGS]: function(getState, payload, dispatch) {
      dispatch(set({ section, isSaving: true }));

      const promise = createAjaxRequest({
        url,
        method: 'PUT',
        dataType: 'json',
        data: JSON.stringify({ id: 1, metadataSource: getMetadataSource(getState) })
      }).request;

      promise.done((data) => {
        const { probe, ...item } = data;

        dispatch(batchActions([
          update({ section, data: item }),

          set({
            section,
            isSaving: false,
            saveError: null,
            pendingChanges: {},
            probe,
            probeFromSave: true,
            testError: null
          })
        ]));
      });

      promise.fail((xhr) => {
        dispatch(set({
          section,
          isSaving: false,
          saveError: xhr
        }));
      });
    },

    [TEST_METADATA_SOURCE]: function(getState, payload, dispatch) {
      dispatch(set({ section, isTesting: true, testError: null }));

      const promise = createAjaxRequest({
        url: `${url}/test`,
        method: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify({ metadataSource: getMetadataSource(getState) })
      }).request;

      promise.done((data) => {
        dispatch(set({
          section,
          isTesting: false,
          probe: data,
          probeFromSave: false
        }));
      });

      promise.fail((xhr) => {
        dispatch(set({
          section,
          isTesting: false,
          probe: null,
          testError: xhr
        }));
      });
    }
  },

  //
  // Reducers

  reducers: {
    // A new address makes the last result stale, so drop it
    [SET_METADATA_SOURCE_SETTINGS_VALUE]: function(state, action) {
      const newState = createSetSettingValueReducer(section)(state, action);

      if (newState === state) {
        return state;
      }

      return updateSectionState(newState, section, {
        ...getSectionState(newState, section),
        probe: null,
        testError: null
      });
    }
  }

};
