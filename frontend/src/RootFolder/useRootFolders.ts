import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import useApiMutation from 'Helpers/Hooks/useApiMutation';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import RootFolder from 'typings/RootFolder';

const DEFAULT_ROOT_FOLDERS: RootFolder[] = [];

const useRootFolders = () => {
  const result = useApiQuery<RootFolder[]>({
    path: '/rootFolder',
  });

  return {
    ...result,
    data: result.data ?? DEFAULT_ROOT_FOLDERS,
  };
};

export default useRootFolders;

export const useRootFolder = (id: number | undefined) => {
  const { data, ...result } = useRootFolders();

  return {
    ...result,
    data: useMemo(
      () => (id ? data.find((rootFolder) => rootFolder.id === id) : undefined),
      [id, data]
    ),
  };
};

// After a root folder change, refetch the root folder list.
export const useRefreshRootFolders = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/rootFolder'] });
  }, [queryClient]);
};

export const useSaveRootFolder = (id: number | undefined) => {
  const refreshRootFolders = useRefreshRootFolders();

  const { mutate, isPending, error, data } = useApiMutation<
    RootFolder,
    Partial<RootFolder>
  >({
    path: id ? `/rootFolder/${id}` : '/rootFolder',
    method: id ? 'PUT' : 'POST',
    mutationOptions: {
      onSuccess: refreshRootFolders,
    },
  });

  return {
    saveRootFolder: mutate,
    isSaving: isPending,
    saveError: error,
    savedRootFolder: data,
  };
};

export const useDeleteRootFolder = (id: number) => {
  const refreshRootFolders = useRefreshRootFolders();

  const { mutate, isPending, error } = useApiMutation<void, void>({
    path: `/rootFolder/${id}`,
    method: 'DELETE',
    mutationOptions: {
      onSuccess: refreshRootFolders,
    },
  });

  return {
    deleteRootFolder: mutate,
    isDeleting: isPending,
    deleteError: error,
  };
};
