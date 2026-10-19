import _ from 'lodash';
import { createAction } from 'redux-actions';
import { createThunk, handleThunks } from 'Store/thunks';
import { set } from './baseActions';
import createFetchHandler from './Creators/createFetchHandler';
import createHandleActions from './Creators/createHandleActions';
import createClearReducer from './Creators/Reducers/createClearReducer';

// Only the queue details feed is left in redux, for the wanted pages until they move
// over in Stage 3. The queue page, its options, the sidebar count and the calendar's
// queue details are on react-query (Activity/Queue); SignalR's queue/details message
// and every queue mutation refresh both.

//
// Variables

export const section = 'queue';
const details = `${section}.details`;

//
// State

export const defaultState = {
  details: {
    isFetching: false,
    isPopulated: false,
    error: null,
    items: [],
    params: {}
  }
};

//
// Actions Types

export const FETCH_QUEUE_DETAILS = 'queue/fetchQueueDetails';
export const CLEAR_QUEUE_DETAILS = 'queue/clearQueueDetails';

//
// Action Creators

export const fetchQueueDetails = createThunk(FETCH_QUEUE_DETAILS);
export const clearQueueDetails = createAction(CLEAR_QUEUE_DETAILS);

//
// Helpers

const fetchQueueDetailsHelper = createFetchHandler(details, '/queue/details');

//
// Action Handlers

export const actionHandlers = handleThunks({

  [FETCH_QUEUE_DETAILS]: function(getState, payload, dispatch) {
    let params = payload;

    // If the payload params are empty try to get params from state.

    if (params && !_.isEmpty(params)) {
      dispatch(set({ section: details, params }));
    } else {
      params = getState().queue.details.params;
    }

    // Ensure there are params before trying to fetch the queue
    // so we don't make a bad request to the server.

    if (params && !_.isEmpty(params)) {
      fetchQueueDetailsHelper(getState, params, dispatch);
    }
  }
});

//
// Reducers

export const reducers = createHandleActions({

  [CLEAR_QUEUE_DETAILS]: createClearReducer(details, defaultState.details)

}, defaultState, section);
