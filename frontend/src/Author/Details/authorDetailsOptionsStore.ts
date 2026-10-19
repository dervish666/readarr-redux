import React from 'react';
import Icon from 'Components/Icon';
import Column from 'Components/Table/Column';
import { createOptionsStore } from 'Helpers/Hooks/useOptionsStore';
import { icons } from 'Helpers/Props';
import SortDirection from 'Helpers/Props/SortDirection';
import translate from 'Utilities/String/translate';

// The author page's two book tables: the Books tab (persisted as
// <instance>_author_details_books_options) and the books inside each series on the
// Series tab (<instance>_author_details_series_options). Defaults are the old redux
// ones (books.columns with authorDetails' sort, series.columns and sort); saved redux
// settings are not carried over.

export interface AuthorDetailsTableOptions {
  columns: Column[];
  selectedFilterKey: string;
  sortKey: string;
  sortDirection: SortDirection;
}

const monitoredColumn: Column = {
  name: 'monitored',
  label: '',
  columnLabel: () => translate('Monitored'),
  isVisible: true,
  isModifiable: false,
};

const titleColumn: Column = {
  name: 'title',
  label: () => translate('Title'),
  isSortable: true,
  isVisible: true,
};

const seriesColumn: Column = {
  name: 'series',
  label: () => translate('Series'),
  isSortable: true,
  isVisible: false,
};

const releaseDateColumn: Column = {
  name: 'releaseDate',
  label: () => translate('ReleaseDate'),
  isSortable: true,
  isVisible: true,
};

const pageCountColumn: Column = {
  name: 'pageCount',
  label: () => translate('Pages'),
  isSortable: true,
  isVisible: true,
};

const ratingColumn: Column = {
  name: 'rating',
  label: () => translate('Rating'),
  isSortable: true,
  isVisible: true,
};

const actionsColumn: Column = {
  name: 'actions',
  label: '',
  columnLabel: () => translate('Actions'),
  isVisible: true,
  isModifiable: false,
};

export const authorDetailsBooksOptions =
  createOptionsStore<AuthorDetailsTableOptions>(
    'author_details_books_options',
    () => {
      return {
        selectedFilterKey: 'all',
        sortKey: 'releaseDate',
        sortDirection: SortDirection.Descending,
        columns: [
          {
            name: 'select',
            label: '',
            columnLabel: () => translate('Select'),
            isSortable: false,
            isVisible: true,
            isModifiable: false,
          },
          monitoredColumn,
          titleColumn,
          seriesColumn,
          releaseDateColumn,
          pageCountColumn,
          ratingColumn,
          {
            name: 'indexerFlags',
            columnLabel: () => translate('IndexerFlags'),
            label: React.createElement(Icon, {
              name: icons.FLAG,
              title: () => translate('IndexerFlags'),
            }),
            isVisible: false,
          },
          {
            name: 'status',
            label: () => translate('Status'),
            isSortable: true,
            isVisible: true,
          },
          actionsColumn,
        ],
      };
    }
  );

export const authorDetailsSeriesOptions =
  createOptionsStore<AuthorDetailsTableOptions>(
    'author_details_series_options',
    () => {
      return {
        selectedFilterKey: 'all',
        sortKey: 'position',
        sortDirection: SortDirection.Ascending,
        columns: [
          monitoredColumn,
          titleColumn,
          seriesColumn,
          {
            name: 'position',
            label: () => translate('Number'),
            isSortable: true,
            isVisible: true,
          },
          releaseDateColumn,
          pageCountColumn,
          ratingColumn,
          {
            name: 'status',
            label: () => translate('Status'),
            isVisible: true,
          },
          actionsColumn,
        ],
      };
    }
  );
