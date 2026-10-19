import { createThunk, handleThunks } from 'Store/thunks';
import createFetchHandler from './Creators/createFetchHandler';
import createHandleActions from './Creators/createHandleActions';

// Read-only feed until Stage 3: author, book, calendar and settings pages still read
// state.tags. Settings > Tags, the tag input and SignalR use react-query (Tags/useTags)
// and dispatch fetchTags after every change so this copy stays current.

//
// Variables

export const section = 'tags';

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

export const FETCH_TAGS = 'tags/fetchTags';

//
// Action Creators

export const fetchTags = createThunk(FETCH_TAGS);

//
// Action Handlers

export const actionHandlers = handleThunks({
  [FETCH_TAGS]: createFetchHandler(section, '/tag')
});

//
// Reducers
export const reducers = createHandleActions({}, defaultState, section);
