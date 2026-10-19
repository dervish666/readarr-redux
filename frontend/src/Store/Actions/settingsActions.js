import { createAction } from 'redux-actions';
import { handleThunks } from 'Store/thunks';
import createHandleActions from './Creators/createHandleActions';
import customFormats from './Settings/customFormats';
import customFormatSpecifications from './Settings/customFormatSpecifications';
import development from './Settings/development';
import general from './Settings/general';
import languages from './Settings/languages';
import mediaManagement from './Settings/mediaManagement';
import metadataProfiles from './Settings/metadataProfiles';
import naming from './Settings/naming';
import namingExamples from './Settings/namingExamples';
import qualityProfiles from './Settings/qualityProfiles';
import rootFolders from './Settings/rootFolders';
import ui from './Settings/ui';

export * from './Settings/customFormatSpecifications.js';
export * from './Settings/customFormats';
export * from './Settings/general';
export * from './Settings/languages';
export * from './Settings/metadataProfiles';
export * from './Settings/mediaManagement';
export * from './Settings/naming';
export * from './Settings/namingExamples';
export * from './Settings/qualityProfiles';
export * from './Settings/rootFolders';
export * from './Settings/development';
export * from './Settings/ui';

//
// Variables

export const section = 'settings';

//
// State

export const defaultState = {
  advancedSettings: false,

  customFormatSpecifications: customFormatSpecifications.defaultState,
  customFormats: customFormats.defaultState,
  general: general.defaultState,
  languages: languages.defaultState,
  metadataProfiles: metadataProfiles.defaultState,
  mediaManagement: mediaManagement.defaultState,
  naming: naming.defaultState,
  namingExamples: namingExamples.defaultState,
  qualityProfiles: qualityProfiles.defaultState,
  rootFolders: rootFolders.defaultState,
  development: development.defaultState,
  ui: ui.defaultState
};

export const persistState = [
  'settings.advancedSettings'
];

//
// Actions Types

export const TOGGLE_ADVANCED_SETTINGS = 'settings/toggleAdvancedSettings';

//
// Action Creators

export const toggleAdvancedSettings = createAction(TOGGLE_ADVANCED_SETTINGS);

//
// Action Handlers

export const actionHandlers = handleThunks({
  ...customFormatSpecifications.actionHandlers,
  ...customFormats.actionHandlers,
  ...general.actionHandlers,
  ...languages.actionHandlers,
  ...metadataProfiles.actionHandlers,
  ...mediaManagement.actionHandlers,
  ...naming.actionHandlers,
  ...namingExamples.actionHandlers,
  ...qualityProfiles.actionHandlers,
  ...rootFolders.actionHandlers,
  ...development.actionHandlers,
  ...ui.actionHandlers
});

//
// Reducers

export const reducers = createHandleActions({

  [TOGGLE_ADVANCED_SETTINGS]: (state, { payload }) => {
    return Object.assign({}, state, { advancedSettings: !state.advancedSettings });
  },

  ...customFormatSpecifications.reducers,
  ...customFormats.reducers,
  ...general.reducers,
  ...languages.reducers,
  ...metadataProfiles.reducers,
  ...mediaManagement.reducers,
  ...naming.reducers,
  ...namingExamples.reducers,
  ...qualityProfiles.reducers,
  ...rootFolders.reducers,
  ...development.reducers,
  ...ui.reducers

}, defaultState, section);
