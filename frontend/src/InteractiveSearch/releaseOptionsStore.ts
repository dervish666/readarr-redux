import { createElement } from 'react';
import Icon from 'Components/Icon';
import Column from 'Components/Table/Column';
import { createOptionsStore } from 'Helpers/Hooks/useOptionsStore';
import { icons } from 'Helpers/Props';
import SortDirection from 'Helpers/Props/SortDirection';
import translate from 'Utilities/String/translate';

// The redux releases slice persisted only the selected filter of each search; the
// sort lives in useReleases' unpersisted store, as it did in redux.
export interface ReleaseOptions {
  bookSelectedFilterKey: string | number;
  authorSelectedFilterKey: string | number;
  columns: Column[];
}

const { useOptions, useOption, getOptions, setOptions, setOption } =
  createOptionsStore<ReleaseOptions>('release_options', () => {
    return {
      bookSelectedFilterKey: 'all',
      authorSelectedFilterKey: 'all',
      columns: [
        {
          name: 'protocol',
          label: () => translate('Source'),
          isSortable: true,
          isVisible: true,
        },
        {
          name: 'age',
          label: () => translate('Age'),
          isSortable: true,
          isVisible: true,
        },
        {
          name: 'title',
          label: () => translate('Title'),
          isSortable: true,
          isVisible: true,
        },
        {
          name: 'indexer',
          label: () => translate('Indexer'),
          isSortable: true,
          isVisible: true,
        },
        {
          name: 'size',
          label: () => translate('Size'),
          isSortable: true,
          isVisible: true,
        },
        {
          name: 'peers',
          label: () => translate('Peers'),
          isSortable: true,
          isVisible: true,
        },
        {
          name: 'qualityWeight',
          label: () => translate('Quality'),
          isSortable: true,
          isVisible: true,
        },
        {
          name: 'customFormatScore',
          label: createElement(Icon, {
            name: icons.SCORE,
            title: () => translate('CustomFormatScore'),
          }),
          isSortable: true,
          isVisible: true,
        },
        {
          name: 'indexerFlags',
          label: createElement(Icon, {
            name: icons.FLAG,
            title: () => translate('IndexerFlags'),
          }),
          isSortable: true,
          isVisible: true,
        },
        {
          name: 'rejections',
          label: createElement(Icon, {
            name: icons.DANGER,
            title: () => translate('Rejections'),
          }),
          isSortable: true,
          fixedSortDirection: SortDirection.Ascending,
          isVisible: true,
        },
        {
          name: 'releaseWeight',
          label: createElement(Icon, { name: icons.DOWNLOAD }),
          isSortable: true,
          fixedSortDirection: SortDirection.Ascending,
          isVisible: true,
        },
      ],
    };
  });

export const useReleaseOptions = useOptions;
export const useReleaseOption = useOption;
export const getReleaseOptions = getOptions;
export const setReleaseOptions = setOptions;
export const setReleaseOption = setOption;
