import React from 'react';
import Icon from 'Components/Icon';
import {
  createOptionsStore,
  PageableOptions,
} from 'Helpers/Hooks/useOptionsStore';
import { icons } from 'Helpers/Props';
import SortDirection from 'Helpers/Props/SortDirection';
import translate from 'Utilities/String/translate';

export interface QueueOptions extends PageableOptions {
  includeUnknownAuthorItems: boolean;
}

const { useOptions, useOption, setOptions, setOption, setSort } =
  createOptionsStore<QueueOptions>('queue_options', () => {
    return {
      includeUnknownAuthorItems: true,
      pageSize: 20,
      selectedFilterKey: 'all',
      sortKey: 'timeleft',
      sortDirection: SortDirection.Ascending,
      columns: [
        {
          name: 'status',
          label: '',
          columnLabel: () => translate('Status'),
          isSortable: true,
          isVisible: true,
          isModifiable: false,
        },
        {
          name: 'authorMetadata.sortName',
          label: () => translate('Author'),
          isSortable: true,
          isVisible: true,
        },
        {
          name: 'books.title',
          label: () => translate('BookTitle'),
          isSortable: true,
          isVisible: true,
        },
        {
          name: 'books.releaseDate',
          label: () => translate('ReleaseDate'),
          isSortable: true,
          isVisible: false,
        },
        {
          name: 'quality',
          label: () => translate('Quality'),
          isSortable: true,
          isVisible: true,
        },
        {
          name: 'customFormats',
          label: () => translate('Formats'),
          isSortable: false,
          isVisible: true,
        },
        {
          name: 'customFormatScore',
          columnLabel: () => translate('CustomFormatScore'),
          label: React.createElement(Icon, {
            name: icons.SCORE,
            title: () => translate('CustomFormatScore'),
          }),
          isVisible: false,
        },
        {
          name: 'protocol',
          label: () => translate('Protocol'),
          isSortable: true,
          isVisible: false,
        },
        {
          name: 'indexer',
          label: () => translate('Indexer'),
          isSortable: true,
          isVisible: false,
        },
        {
          name: 'downloadClient',
          label: () => translate('DownloadClient'),
          isSortable: true,
          isVisible: false,
        },
        {
          name: 'title',
          label: () => translate('ReleaseTitle'),
          isSortable: true,
          isVisible: false,
        },
        {
          name: 'size',
          label: () => translate('Size'),
          isSortable: true,
          isVisible: false,
        },
        {
          name: 'outputPath',
          label: () => translate('OutputPath'),
          isSortable: false,
          isVisible: false,
        },
        {
          name: 'estimatedCompletionTime',
          label: () => translate('TimeLeft'),
          isSortable: true,
          isVisible: true,
        },
        {
          name: 'progress',
          label: () => translate('Progress'),
          isSortable: true,
          isVisible: true,
        },
        {
          name: 'actions',
          label: '',
          columnLabel: () => translate('Actions'),
          isVisible: true,
          isModifiable: false,
        },
      ],
    };
  });

export const useQueueOptions = useOptions;
export const setQueueOptions = setOptions;
export const useQueueOption = useOption;
export const setQueueOption = setOption;
export const setQueueSort = setSort;
