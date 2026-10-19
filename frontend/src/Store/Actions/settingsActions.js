import { handleThunks } from 'Store/thunks';
import createHandleActions from './Creators/createHandleActions';
import ui from './Settings/ui';

// Only the UI settings feed is left here, read by RelativeDateCellConnector through
// createUISettingsSelector. Everything else in settings is on react-query.

export * from './Settings/ui';

//
// Variables

export const section = 'settings';

//
// State

export const defaultState = {
  ui: ui.defaultState
};

//
// Action Handlers

export const actionHandlers = handleThunks({
  ...ui.actionHandlers
});

//
// Reducers

export const reducers = createHandleActions({
  ...ui.reducers
}, defaultState, section);
