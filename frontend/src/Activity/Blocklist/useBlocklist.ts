import { useQueryClient } from '@tanstack/react-query';
import useApiMutation from 'Helpers/Hooks/useApiMutation';
import usePage from 'Helpers/Hooks/usePage';
import usePagedApiQuery from 'Helpers/Hooks/usePagedApiQuery';
import Blocklist from 'typings/Blocklist';
import { useBlocklistOptions } from './blocklistOptionsStore';

interface BulkBlocklistData {
  ids: number[];
}

const useBlocklist = () => {
  const { page, goToPage } = usePage('blocklist');
  const { pageSize, sortKey, sortDirection } = useBlocklistOptions();

  const { refetch, ...query } = usePagedApiQuery<Blocklist>({
    path: '/blocklist',
    page,
    pageSize,
    sortKey,
    sortDirection,
  });

  return {
    ...query,
    goToPage,
    page,
    refetch,
  };
};

export default useBlocklist;

export const useRemoveBlocklistItem = (id: number) => {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useApiMutation<unknown, void>({
    path: `/blocklist/${id}`,
    method: 'DELETE',
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/blocklist'] });
      },
    },
  });

  return {
    removeBlocklistItem: mutate,
    isRemoving: isPending,
  };
};

export const useRemoveBlocklistItems = () => {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useApiMutation<unknown, BulkBlocklistData>({
    path: '/blocklist/bulk',
    method: 'DELETE',
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/blocklist'] });
      },
    },
  });

  return {
    removeBlocklistItems: mutate,
    isRemoving: isPending,
  };
};
