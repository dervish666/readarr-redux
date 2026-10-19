import {
  createOptionsStore,
  PageableOptions,
} from 'Helpers/Hooks/useOptionsStore';
import SortDirection from 'Helpers/Props/SortDirection';
import { getWantedColumns } from 'Wanted/wantedColumns';

const { useOptions, useOption, setOptions, setOption, setSort } =
  createOptionsStore<PageableOptions>('missing_options', () => {
    return {
      pageSize: 20,
      selectedFilterKey: 'monitored',
      sortKey: 'releaseDate',
      sortDirection: SortDirection.Descending,
      columns: getWantedColumns(),
    };
  });

export const useMissingOptions = useOptions;
export const setMissingOptions = setOptions;
export const useMissingOption = useOption;
export const setMissingOption = setOption;
export const setMissingSort = setSort;
