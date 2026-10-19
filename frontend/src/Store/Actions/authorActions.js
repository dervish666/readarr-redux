import { sortDirections } from 'Helpers/Props';
import { createThunk, handleThunks } from 'Store/thunks';
import createFetchHandler from './Creators/createFetchHandler';
import createHandleActions from './Creators/createHandleActions';

//
// Variables

export const section = 'authors';

//
// State

export const defaultState = {
  isFetching: false,
  isPopulated: false,
  error: null,
  isSaving: false,
  saveError: null,
  items: [],
  sortKey: 'sortName',
  sortDirection: sortDirections.ASCENDING
};

//
// Actions Types

export const FETCH_AUTHOR = 'authors/fetchAuthor';

//
// Action Creators

export const fetchAuthor = createThunk(FETCH_AUTHOR);

//
// Action Handlers

export const actionHandlers = handleThunks({

  [FETCH_AUTHOR]: createFetchHandler(section, '/author')

});

//
// Reducers

export const reducers = createHandleActions({}, defaultState, section);
