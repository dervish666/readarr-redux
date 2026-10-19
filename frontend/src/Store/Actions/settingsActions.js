import { handleThunks } from 'Store/thunks';
import createHandleActions from './Creators/createHandleActions';
import metadataProfiles from './Settings/metadataProfiles';
import naming from './Settings/naming';
import qualityProfiles from './Settings/qualityProfiles';
import rootFolders from './Settings/rootFolders';
import ui from './Settings/ui';

// Only the read-only feeds the Stage 3 pages (author, book, calendar, organize and
// friends) still read are left here. Every settings page is on react-query.

export * from './Settings/metadataProfiles';
export * from './Settings/naming';
export * from './Settings/qualityProfiles';
export * from './Settings/rootFolders';
export * from './Settings/ui';

//
// Variables

export const section = 'settings';

//
// State

export const defaultState = {
  metadataProfiles: metadataProfiles.defaultState,
  naming: naming.defaultState,
  qualityProfiles: qualityProfiles.defaultState,
  rootFolders: rootFolders.defaultState,
  ui: ui.defaultState
};

//
// Action Handlers

export const actionHandlers = handleThunks({
  ...metadataProfiles.actionHandlers,
  ...naming.actionHandlers,
  ...qualityProfiles.actionHandlers,
  ...rootFolders.actionHandlers,
  ...ui.actionHandlers
});

//
// Reducers

export const reducers = createHandleActions({
  ...metadataProfiles.reducers,
  ...naming.reducers,
  ...qualityProfiles.reducers,
  ...rootFolders.reducers,
  ...ui.reducers
}, defaultState, section);
