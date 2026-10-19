import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import useApiMutation from 'Helpers/Hooks/useApiMutation';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import { fetchRootFolders } from 'Store/Actions/settingsActions';
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

// After a root folder change, refresh react-query and the redux rootFolders feed that
// add-new, the author editor, import lists and remote path mappings still read.
export const useRefreshRootFolders = () => {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/rootFolder'] });
    dispatch(fetchRootFolders());
  }, [queryClient, dispatch]);
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
