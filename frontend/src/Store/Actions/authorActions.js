import _ from 'lodash';
import { filterTypePredicates, filterTypes, sortDirections } from 'Helpers/Props';
import { createThunk, handleThunks } from 'Store/thunks';
import createAjaxRequest from 'Utilities/createAjaxRequest';
import dateFilterPredicate from 'Utilities/Date/dateFilterPredicate';
import { updateItem } from './baseActions';
import createFetchHandler from './Creators/createFetchHandler';
import createHandleActions from './Creators/createHandleActions';

//
// Variables

export const section = 'authors';

export const filters = [
  {
    key: 'all',
    label: 'All',
    filters: []
  },
  {
    key: 'monitored',
    label: 'Monitored Only',
    filters: [
      {
        key: 'monitored',
        value: true,
        type: filterTypes.EQUAL
      }
    ]
  },
  {
    key: 'unmonitored',
    label: 'Unmonitored Only',
    filters: [
      {
        key: 'monitored',
        value: false,
        type: filterTypes.EQUAL
      }
    ]
  },
  {
    key: 'continuing',
    label: 'Continuing Only',
    filters: [
      {
        key: 'status',
        value: 'continuing',
        type: filterTypes.EQUAL
      }
    ]
  },
  {
    key: 'ended',
    label: 'Ended Only',
    filters: [
      {
        key: 'status',
        value: 'ended',
        type: filterTypes.EQUAL
      }
    ]
  },
  {
    key: 'missing',
    label: 'Missing Books',
    filters: [
      {
        key: 'missing',
        value: true,
        type: filterTypes.EQUAL
      }
    ]
  }
];

export const filterPredicates = {
  missing: function(item) {
    const { statistics = {} } = item;

    return statistics.bookCount - statistics.bookFileCount > 0;
  },

  nextBook: function(item, filterValue, type) {
    return dateFilterPredicate(item.nextBook, filterValue, type);
  },

  lastBook: function(item, filterValue, type) {
    return dateFilterPredicate(item.lastBook, filterValue, type);
  },

  added: function(item, filterValue, type) {
    return dateFilterPredicate(item.added, filterValue, type);
  },

  ratings: function(item, filterValue, type) {
    const predicate = filterTypePredicates[type];

    return predicate(item.ratings.value * 10, filterValue);
  },

  bookCount: function(item, filterValue, type) {
    const predicate = filterTypePredicates[type];
    const bookCount = item.statistics ? item.statistics.bookCount : 0;

    return predicate(bookCount, filterValue);
  },

  sizeOnDisk: function(item, filterValue, type) {
    const predicate = filterTypePredicates[type];
    const sizeOnDisk = item.statistics && item.statistics.sizeOnDisk ?
      item.statistics.sizeOnDisk :
      0;

    return predicate(sizeOnDisk, filterValue);
  }
};

export const sortPredicates = {
  status: function(item) {
    let result = 0;

    if (item.monitored) {
      result += 2;
    }

    if (item.status === 'continuing') {
      result++;
    }

    return result;
  },

  sizeOnDisk: function(item) {
    const { statistics = {} } = item;

    return statistics.sizeOnDisk || 0;
  }
};

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
export const TOGGLE_AUTHOR_MONITORED = 'authors/toggleAuthorMonitored';

//
// Action Creators

export const fetchAuthor = createThunk(FETCH_AUTHOR);

// Still used by the bookshelf (JS). The author pages save through Author/useAuthors.ts.
export const toggleAuthorMonitored = createThunk(TOGGLE_AUTHOR_MONITORED);

//
// Action Handlers

export const actionHandlers = handleThunks({

  [FETCH_AUTHOR]: createFetchHandler(section, '/author'),

  [TOGGLE_AUTHOR_MONITORED]: (getState, payload, dispatch) => {
    const {
      authorId: id,
      monitored
    } = payload;

    const author = _.find(getState().authors.items, { id });

    dispatch(updateItem({
      id,
      section,
      isSaving: true
    }));

    const promise = createAjaxRequest({
      url: `/author/${id}`,
      method: 'PUT',
      data: JSON.stringify({
        ...author,
        monitored
      }),
      dataType: 'json'
    }).request;

    promise.done((data) => {
      dispatch(updateItem({
        id,
        section,
        isSaving: false,
        monitored
      }));
    });

    promise.fail((xhr) => {
      dispatch(updateItem({
        id,
        section,
        isSaving: false
      }));
    });
  }
});

//
// Reducers

export const reducers = createHandleActions({}, defaultState, section);
