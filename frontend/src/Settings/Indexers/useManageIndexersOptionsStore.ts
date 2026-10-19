import { createOptionsStore } from 'Helpers/Hooks/useOptionsStore';
import SortDirection from 'Helpers/Props/SortDirection';

export interface ManageIndexersOptions {
  sortKey: string;
  sortDirection: SortDirection;
}

const { useOptions, setSort } = createOptionsStore<ManageIndexersOptions>(
  'manage_indexers_options',
  () => ({
    sortKey: 'name',
    sortDirection: SortDirection.Ascending,
  })
);

export const useManageIndexersOptions = useOptions;
export const setManageIndexersSort = setSort;
