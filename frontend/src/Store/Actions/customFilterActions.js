import { createThunk, handleThunks } from 'Store/thunks';
import createFetchHandler from './Creators/createFetchHandler';
import createHandleActions from './Creators/createHandleActions';

// Read-only feed until Stage 3: author, book, bookshelf, calendar, wanted and release
// pages still read state.customFilters. The filter builder and custom filter list save
// and delete through react-query (Filters/useCustomFilters), which writes each change
// into this copy with updateItem/removeItem.

//
// Variables

export const section = 'customFilters';

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

export const FETCH_CUSTOM_FILTERS = 'customFilters/fetchCustomFilters';

//
// Action Creators

export const fetchCustomFilters = createThunk(FETCH_CUSTOM_FILTERS);

//
// Action Handlers

export const actionHandlers = handleThunks({
  [FETCH_CUSTOM_FILTERS]: createFetchHandler(section, '/customFilter')
});

//
// Reducers
export const reducers = createHandleActions({}, defaultState, section);
