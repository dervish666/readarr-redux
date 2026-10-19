import { setAppValue } from 'Store/Actions/appActions';
import { createThunk, handleThunks } from 'Store/thunks';
import createAjaxRequest from 'Utilities/createAjaxRequest';
import { pingServer } from './appActions';
import createFetchHandler from './Creators/createFetchHandler';
import createHandleActions from './Creators/createHandleActions';

//
// Variables

// The System pages run on react-query (System/**/use*.ts). What stays here is the
// read-only state.system.status feed for the shell, settings and add-new modals
// (fetched at startup by PageConnector), and the restart and shutdown actions.
export const section = 'system';

//
// State

export const defaultState = {
  status: {
    isFetching: false,
    isPopulated: false,
    error: null,
    item: {}
  }
};

//
// Actions Types

export const FETCH_STATUS = 'system/status/fetchStatus';

export const RESTART = 'system/restart';
export const SHUTDOWN = 'system/shutdown';

//
// Action Creators

export const fetchStatus = createThunk(FETCH_STATUS);

export const restart = createThunk(RESTART);
export const shutdown = createThunk(SHUTDOWN);

//
// Action Handlers

export const actionHandlers = handleThunks({
  [FETCH_STATUS]: createFetchHandler('system.status', '/system/status'),

  [RESTART]: function(getState, payload, dispatch) {
    const promise = createAjaxRequest({
      url: '/system/restart',
      method: 'POST'
    }).request;

    promise.done(() => {
      dispatch(setAppValue({ isRestarting: true }));
      dispatch(pingServer());
    });
  },

  [SHUTDOWN]: function() {
    createAjaxRequest({
      url: '/system/shutdown',
      method: 'POST'
    });
  }
});

//
// Reducers

export const reducers = createHandleActions({}, defaultState, section);
