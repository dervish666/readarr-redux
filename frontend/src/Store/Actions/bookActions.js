import { batchActions } from 'redux-batched-actions';
import { createThunk, handleThunks } from 'Store/thunks';
import createAjaxRequest from 'Utilities/createAjaxRequest';
import { removeItem, set, update } from './baseActions';
import createHandleActions from './Creators/createHandleActions';

// The redux books feed, kept for its unconverted readers (the header search and the
// book editor's JS delete modal). Fetched at startup by PageConnector and kept current
// by SignalR and the react-query book hooks (useUpdateBookCaches).

//
// Variables

export const section = 'books';

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

export const FETCH_BOOKS = 'books/fetchBooks';
export const DELETE_AUTHOR_BOOKS = 'books/deleteAuthorBooks';

//
// Action Creators

export const fetchBooks = createThunk(FETCH_BOOKS);

export const deleteAuthorBooks = createThunk(DELETE_AUTHOR_BOOKS, (payload) => {
  return {
    ...payload,
    queryParams: {
      authorId: payload.authorId
    }
  };
});

//
// Action Handlers

export const actionHandlers = handleThunks({
  [FETCH_BOOKS]: function(getState, payload, dispatch) {
    dispatch(set({ section, isFetching: true }));

    const { request, abortRequest } = createAjaxRequest({
      url: '/book',
      data: payload,
      traditional: true
    });

    request.done((data) => {
      // Preserve books for other authors we didn't fetch
      if (payload.hasOwnProperty('authorId')) {
        const oldBooks = getState().books.items;
        const newBooks = oldBooks.filter((x) => x.authorId !== payload.authorId);
        data = newBooks.concat(data);
      }

      dispatch(batchActions([
        update({ section, data }),

        set({
          section,
          isFetching: false,
          isPopulated: true,
          error: null
        })
      ]));
    });

    request.fail((xhr) => {
      dispatch(set({
        section,
        isFetching: false,
        isPopulated: false,
        error: xhr.aborted ? null : xhr
      }));
    });

    return abortRequest;
  },

  [DELETE_AUTHOR_BOOKS]: function(getState, payload, dispatch) {
    const { authorId } = payload;
    const books = getState().books.items;

    const toDelete = books.filter((x) => x.authorId === authorId);

    dispatch(batchActions(toDelete.map((b) => removeItem({ section, id: b.id }))));
  }
});

//
// Reducers

export const reducers = createHandleActions({}, defaultState, section);
