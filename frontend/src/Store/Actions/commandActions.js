import { batchActions } from 'redux-batched-actions';
import { queryClient } from 'App/queryClient';
import { addNewCommand } from 'Commands/addNewCommand';
import { createThunk, handleThunks } from 'Store/thunks';
import { isSameCommand } from 'Utilities/Command';
import createAjaxRequest from 'Utilities/createAjaxRequest';
import { hideMessage } from './appActions';
import { removeItem, updateItem } from './baseActions';
import createFetchHandler from './Creators/createFetchHandler';
import createHandleActions from './Creators/createHandleActions';

// Redux feed of the command list for pages not yet on react-query (author, book,
// calendar, wanted, interactive import, organize/retag, settings). Commands/useCommands.ts
// owns the list, the sidebar messages and the SignalR updates; SignalRListener also
// dispatches updateCommand/finishCommand here, and executeCommand below writes its new
// command into the react-query cache, so both sides see every command.

//
// Variables

export const section = 'commands';

let lastCommand = null;
let lastCommandTimeout = null;
const removeCommandTimeoutIds = {};
const commandFinishedCallbacks = {};

//
// State

export const defaultState = {
  isFetching: false,
  isPopulated: false,
  error: null,
  items: []
};

//
// Actions Types

export const FETCH_COMMANDS = 'commands/fetchCommands';
export const EXECUTE_COMMAND = 'commands/executeCommand';
export const ADD_COMMAND = 'commands/addCommand';
export const UPDATE_COMMAND = 'commands/updateCommand';
export const FINISH_COMMAND = 'commands/finishCommand';
export const REMOVE_COMMAND = 'commands/removeCommand';

//
// Action Creators

export const fetchCommands = createThunk(FETCH_COMMANDS);
export const executeCommand = createThunk(EXECUTE_COMMAND);
export const addCommand = createThunk(ADD_COMMAND);
export const updateCommand = createThunk(UPDATE_COMMAND);
export const finishCommand = createThunk(FINISH_COMMAND);
export const removeCommand = createThunk(REMOVE_COMMAND);

//
// Helpers

function scheduleRemoveCommand(command, dispatch) {
  const {
    id,
    status
  } = command;

  if (status === 'queued') {
    return;
  }

  const timeoutId = removeCommandTimeoutIds[id];

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  removeCommandTimeoutIds[id] = setTimeout(() => {
    dispatch(batchActions([
      removeCommand({ section: 'commands', id }),
      hideMessage({ id })
    ]));

    delete removeCommandTimeoutIds[id];
  }, 60000 * 5);
}

export function executeCommandHelper(payload, dispatch) {
  // TODO: show a message for the user
  if (lastCommand && isSameCommand(lastCommand, payload)) {
    console.warn('Please wait at least 5 seconds before running this command again');
  }

  lastCommand = payload;

  // clear last command after 5 seconds.
  if (lastCommandTimeout) {
    clearTimeout(lastCommandTimeout);
  }

  lastCommandTimeout = setTimeout(() => {
    lastCommand = null;
  }, 5000);

  const {
    commandFinished,
    ...requestPayload
  } = payload;

  const promise = createAjaxRequest({
    url: '/command',
    method: 'POST',
    data: JSON.stringify(requestPayload),
    dataType: 'json'
  }).request;

  return promise.then((data) => {
    if (commandFinished) {
      commandFinishedCallbacks[data.id] = commandFinished;
    }

    dispatch(addCommand(data));

    queryClient.setQueryData(['/command'], (oldCommands) => addNewCommand(oldCommands, data));

    return data;
  });
}

//
// Action Handlers

export const actionHandlers = handleThunks({
  [FETCH_COMMANDS]: createFetchHandler('commands', '/command'),

  [EXECUTE_COMMAND]: function(getState, payload, dispatch) {
    executeCommandHelper(payload, dispatch);
  },

  [ADD_COMMAND]: function(getState, payload, dispatch) {
    // SignalR progress can land before the POST response; don't roll it back to queued.
    if (getState().commands.items.some((command) => command.id === payload.id)) {
      return;
    }

    dispatch(updateItem({ section: 'commands', ...payload }));
  },

  [UPDATE_COMMAND]: function(getState, payload, dispatch) {
    dispatch(updateItem({ section: 'commands', ...payload }));

    scheduleRemoveCommand(payload, dispatch);
  },

  [FINISH_COMMAND]: function(getState, payload, dispatch) {
    const commandFinished = commandFinishedCallbacks[payload.id];

    if (commandFinished) {
      commandFinished(payload);
    }

    delete commandFinishedCallbacks[payload.id];

    dispatch(updateItem({ section: 'commands', ...payload }));
    scheduleRemoveCommand(payload, dispatch);
  },

  [REMOVE_COMMAND]: function(getState, payload, dispatch) {
    dispatch(removeItem({ section: 'commands', ...payload }));
  }

});

//
// Reducers

export const reducers = createHandleActions({}, defaultState, section);
