import {
  createOptionsStore,
  PageableOptions,
} from 'Helpers/Hooks/useOptionsStore';
import SortDirection from 'Helpers/Props/SortDirection';
import { getWantedColumns } from 'Wanted/wantedColumns';

const { useOptions, useOption, setOptions, setOption, setSort } =
  createOptionsStore<PageableOptions>('cutoff_unmet_options', () => {
    return {
      pageSize: 20,
      selectedFilterKey: 'monitored',
      sortKey: 'releaseDate',
      sortDirection: SortDirection.Descending,
      columns: getWantedColumns(),
    };
  });

export const useCutoffUnmetOptions = useOptions;
export const setCutoffUnmetOptions = setOptions;
export const useCutoffUnmetOption = useOption;
export const setCutoffUnmetOption = setOption;
export const setCutoffUnmetSort = setSort;
