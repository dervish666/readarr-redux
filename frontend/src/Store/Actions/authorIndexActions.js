import { createAction } from 'redux-actions';
import { createThunk, handleThunks } from 'Store/thunks';
import createAjaxRequest from 'Utilities/createAjaxRequest';
import { set } from './baseActions';
import createHandleActions from './Creators/createHandleActions';

// The author index runs on react-query and Author/Index/authorIndexOptionsStore.ts.
// What is left here still has redux users: the book index reads overviewOptions and
// tableOptions (and sets overview options), and the author editor's bulk delete
// (Author/Editor/Delete) runs through bulkDeleteAuthor.

//
// Variables

export const section = 'authorIndex';

//
// State

export const defaultState = {
  isDeleting: false,
  deleteError: null,

  overviewOptions: {
    showTitle: 'lastFirst',
    detailedProgressBar: false,
    size: 'medium',
    showMonitored: true,
    showQualityProfile: true,
    showLastBook: false,
    showAdded: false,
    showBookCount: true,
    showPath: false,
    showSizeOnDisk: false,
    showSearchAction: false
  },

  tableOptions: {
    showTitle: 'lastFirst',
    showBanners: false,
    showSearchAction: false
  }
};

export const persistState = [
  'authorIndex.overviewOptions',
  'authorIndex.tableOptions'
];

//
// Actions Types

export const SET_AUTHOR_OVERVIEW_OPTION = 'authorIndex/setAuthorOverviewOption';
export const BULK_DELETE_AUTHOR = 'authorIndex/bulkDeleteAuthor';

//
// Action Creators

export const setAuthorOverviewOption = createAction(SET_AUTHOR_OVERVIEW_OPTION);
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

export const reducers = createHandleActions({

  [SET_AUTHOR_OVERVIEW_OPTION]: function(state, { payload }) {
    const overviewOptions = state.overviewOptions;

    return {
      ...state,
      overviewOptions: {
        ...overviewOptions,
        ...payload
      }
    };
  }

}, defaultState, section);
