import { createAction } from 'redux-actions';
import { handleThunks } from 'Store/thunks';
import createHandleActions from './Creators/createHandleActions';
import customFormats from './Settings/customFormats';
import customFormatSpecifications from './Settings/customFormatSpecifications';
import development from './Settings/development';
import downloadClientOptions from './Settings/downloadClientOptions';
import downloadClients from './Settings/downloadClients';
import general from './Settings/general';
import importListExclusions from './Settings/importListExclusions';
import importLists from './Settings/importLists';
import indexerFlags from './Settings/indexerFlags';
import indexerOptions from './Settings/indexerOptions';
import indexers from './Settings/indexers';
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
import remotePathMappings from './Settings/remotePathMappings';
import rootFolders from './Settings/rootFolders';
import ui from './Settings/ui';

export * from './Settings/customFormatSpecifications.js';
export * from './Settings/customFormats';
export * from './Settings/downloadClients';
export * from './Settings/downloadClientOptions';
export * from './Settings/general';
export * from './Settings/importLists';
export * from './Settings/importListExclusions';
export * from './Settings/indexerFlags';
export * from './Settings/indexerOptions';
export * from './Settings/indexers';
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
export * from './Settings/remotePathMappings';
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
  downloadClients: downloadClients.defaultState,
  downloadClientOptions: downloadClientOptions.defaultState,
  general: general.defaultState,
  indexerFlags: indexerFlags.defaultState,
  indexerOptions: indexerOptions.defaultState,
  indexers: indexers.defaultState,
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
  remotePathMappings: remotePathMappings.defaultState,
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
  ...downloadClients.actionHandlers,
  ...downloadClientOptions.actionHandlers,
  ...general.actionHandlers,
  ...indexerFlags.actionHandlers,
  ...indexerOptions.actionHandlers,
  ...indexers.actionHandlers,
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
  ...remotePathMappings.actionHandlers,
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
  ...downloadClients.reducers,
  ...downloadClientOptions.reducers,
  ...general.reducers,
  ...indexerFlags.reducers,
  ...indexerOptions.reducers,
  ...indexers.reducers,
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
  ...remotePathMappings.reducers,
  ...rootFolders.reducers,
  ...development.reducers,
  ...ui.reducers

}, defaultState, section);
