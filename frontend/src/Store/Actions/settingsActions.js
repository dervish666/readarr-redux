import { createAction } from 'redux-actions';
import { handleThunks } from 'Store/thunks';
import createHandleActions from './Creators/createHandleActions';
import customFormats from './Settings/customFormats';
import customFormatSpecifications from './Settings/customFormatSpecifications';
import development from './Settings/development';
import general from './Settings/general';
import importListExclusions from './Settings/importListExclusions';
import importLists from './Settings/importLists';
import languages from './Settings/languages';
import mediaManagement from './Settings/mediaManagement';
import metadata from './Settings/metadata';
import metadataProfiles from './Settings/metadataProfiles';
import metadataProvider from './Settings/metadataProvider';
import metadataSource from './Settings/metadataSource';
import naming from './Settings/naming';
import namingExamples from './Settings/namingExamples';
import notifications from './Settings/notifications';
import qualityProfiles from './Settings/qualityProfiles';
import rootFolders from './Settings/rootFolders';
import ui from './Settings/ui';

export * from './Settings/customFormatSpecifications.js';
export * from './Settings/customFormats';
export * from './Settings/general';
export * from './Settings/importLists';
export * from './Settings/importListExclusions';
export * from './Settings/languages';
export * from './Settings/metadataProfiles';
export * from './Settings/mediaManagement';
export * from './Settings/metadata';
export * from './Settings/metadataProvider';
export * from './Settings/metadataSource';
export * from './Settings/naming';
export * from './Settings/namingExamples';
export * from './Settings/notifications';
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
  importLists: importLists.defaultState,
  importListExclusions: importListExclusions.defaultState,
  languages: languages.defaultState,
  metadataProfiles: metadataProfiles.defaultState,
  mediaManagement: mediaManagement.defaultState,
  metadata: metadata.defaultState,
  metadataProvider: metadataProvider.defaultState,
  metadataSource: metadataSource.defaultState,
  naming: naming.defaultState,
  namingExamples: namingExamples.defaultState,
  notifications: notifications.defaultState,
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
  ...importLists.actionHandlers,
  ...importListExclusions.actionHandlers,
  ...languages.actionHandlers,
  ...metadataProfiles.actionHandlers,
  ...mediaManagement.actionHandlers,
  ...metadata.actionHandlers,
  ...metadataProvider.actionHandlers,
  ...metadataSource.actionHandlers,
  ...naming.actionHandlers,
  ...namingExamples.actionHandlers,
  ...notifications.actionHandlers,
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
  ...importLists.reducers,
  ...importListExclusions.reducers,
  ...languages.reducers,
  ...metadataProfiles.reducers,
  ...mediaManagement.reducers,
  ...metadata.reducers,
  ...metadataProvider.reducers,
  ...metadataSource.reducers,
  ...naming.reducers,
  ...namingExamples.reducers,
  ...notifications.reducers,
  ...qualityProfiles.reducers,
  ...rootFolders.reducers,
  ...development.reducers,
  ...ui.reducers

}, defaultState, section);
