import { createOptionsStore } from 'Helpers/Hooks/useOptionsStore';
import SortDirection from 'Helpers/Props/SortDirection';

export interface ManageDownloadClientsOptions {
  sortKey: string;
  sortDirection: SortDirection;
}

const { useOptions, setSort } =
  createOptionsStore<ManageDownloadClientsOptions>(
    'manage_download_clients_options',
    () => ({
      sortKey: 'name',
      sortDirection: SortDirection.Ascending,
    })
  );

export const useManageDownloadClientsOptions = useOptions;
export const setManageDownloadClientsSort = setSort;
