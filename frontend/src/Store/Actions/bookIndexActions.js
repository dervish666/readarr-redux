import { createThunk, handleThunks } from 'Store/thunks';
import createAjaxRequest from 'Utilities/createAjaxRequest';
import { set } from './baseActions';
import createHandleActions from './Creators/createHandleActions';

// The book index runs on react-query and Book/Index/bookIndexOptionsStore.ts.
// What is left here is the book editor's bulk delete (Book/Editor/Delete), which the
// book index and author details footers still run through bulkDeleteBook.

//
// Variables

export const section = 'bookIndex';

//
// State

export const defaultState = {
  isDeleting: false,
  deleteError: null
};

//
// Actions Types

export const BULK_DELETE_BOOK = 'bookEditor/bulkDeleteBook';

//
// Action Creators

export const bulkDeleteBook = createThunk(BULK_DELETE_BOOK);

//
// Action Handlers

export const actionHandlers = handleThunks({
  [BULK_DELETE_BOOK]: function(getState, payload, dispatch) {
    dispatch(set({
      section,
      isDeleting: true
    }));

    const promise = createAjaxRequest({
      url: '/book/editor',
      method: 'DELETE',
      data: JSON.stringify(payload),
      dataType: 'json'
    }).request;

    promise.done(() => {
      // SignalR removes the books from the redux feed and the react-query lists

      dispatch(set({
        section,
        isDeleting: false,
        deleteError: null
      }));
    });

    promise.fail((xhr) => {
      dispatch(set({
        section,
        isDeleting: false,
        deleteError: xhr
      }));
    });
  }
});

//
// Reducers

export const reducers = createHandleActions({}, defaultState, section);
