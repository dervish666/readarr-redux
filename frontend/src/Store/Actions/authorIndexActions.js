import { createThunk, handleThunks } from 'Store/thunks';
import createAjaxRequest from 'Utilities/createAjaxRequest';
import { set } from './baseActions';
import createHandleActions from './Creators/createHandleActions';

// The author index runs on react-query and Author/Index/authorIndexOptionsStore.ts.
// What is left here is the author editor's bulk delete (Author/Editor/Delete), which
// still runs through bulkDeleteAuthor.

//
// Variables

export const section = 'authorIndex';

//
// State

export const defaultState = {
  isDeleting: false,
  deleteError: null
};

//
// Actions Types

export const BULK_DELETE_AUTHOR = 'authorIndex/bulkDeleteAuthor';

//
// Action Creators

export const bulkDeleteAuthor = createThunk(BULK_DELETE_AUTHOR);

//
// Action Handlers

export const actionHandlers = handleThunks({
  [BULK_DELETE_AUTHOR]: function(getState, payload, dispatch) {
    dispatch(set({
      section,
      isDeleting: true
    }));

    const promise = createAjaxRequest({
      url: '/author/editor',
      method: 'DELETE',
      data: JSON.stringify(payload),
      dataType: 'json'
    }).request;

    promise.done(() => {
      // SignalR removes the authors from the redux feed and the react-query list

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
