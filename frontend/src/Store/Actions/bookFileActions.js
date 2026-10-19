import { createAction } from 'redux-actions';
import { createThunk, handleThunks } from 'Store/thunks';
import createFetchHandler from './Creators/createFetchHandler';
import createHandleActions from './Creators/createHandleActions';
import createClearReducer from './Creators/Reducers/createClearReducer';

//
// Variables

// Only the author page still fills this feed (fetchBookFiles({ authorId })), for the
// book editor's delete modal (Book/Editor/Delete). Every other book file list is on
// BookFile/useBookFiles.ts, which also writes its changes here.

export const section = 'bookFiles';

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

export const FETCH_BOOK_FILES = 'bookFiles/fetchBookFiles';
export const CLEAR_BOOK_FILES = 'bookFiles/clearBookFiles';

//
// Action Creators

export const fetchBookFiles = createThunk(FETCH_BOOK_FILES);
export const clearBookFiles = createAction(CLEAR_BOOK_FILES);

//
// Action Handlers

export const actionHandlers = handleThunks({
  [FETCH_BOOK_FILES]: createFetchHandler(section, '/bookFile')
});

//
// Reducers

export const reducers = createHandleActions({
  [CLEAR_BOOK_FILES]: createClearReducer(section, {
    isFetching: false,
    isPopulated: false,
    error: null,
    items: []
  })

}, defaultState, section);
