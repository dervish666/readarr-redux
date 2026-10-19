import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import useApiMutation from 'Helpers/Hooks/useApiMutation';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import { removeItem, updateItem } from 'Store/Actions/baseActions';
import { CustomFilter } from './Filter';

const DEFAULT_CUSTOM_FILTERS: CustomFilter[] = [];

const useCustomFilters = () => {
  const result = useApiQuery<CustomFilter[]>({
    path: '/customFilter',
  });

  return {
    ...result,
    data: result.data ?? DEFAULT_CUSTOM_FILTERS,
  };
};

export default useCustomFilters;

export const useCustomFiltersList = (type: string) => {
  const { data } = useCustomFilters();

  return useMemo(
    () =>
      data
        .filter((customFilter) => customFilter.type === type)
        .sort((a, b) => a.label.localeCompare(b.label)),
    [data, type]
  );
};

// After a custom filter change, update react-query and the redux customFilters feed
// that author, book, bookshelf, calendar, wanted and release pages still read. The
// feed gets the saved filter straight away, so a page that selects it right after the
// save finds it.
const useSyncCustomFilters = () => {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  return useCallback(
    (change: { saved: CustomFilter } | { deletedId: number }) => {
      // Write the change into the list first: the author index reads its filters from
      // react-query and selects a new filter straight after the save, so waiting for the
      // refetch renders once with a selected filter that isn't in the list yet.
      queryClient.setQueryData<CustomFilter[]>(['/customFilter'], (old) => {
        if (!old) {
          return old;
        }

        if ('saved' in change) {
          const others = old.filter((f) => f.id !== change.saved.id);

          return [...others, change.saved];
        }

        return old.filter((f) => f.id !== change.deletedId);
      });

      queryClient.invalidateQueries({ queryKey: ['/customFilter'] });

      if ('saved' in change) {
        dispatch(updateItem({ section: 'customFilters', ...change.saved }));
      } else {
        dispatch(
          removeItem({ section: 'customFilters', id: change.deletedId })
        );
      }
    },
    [queryClient, dispatch]
  );
};

export const useSaveCustomFilter = (id: number | null) => {
  const syncCustomFilters = useSyncCustomFilters();

  const { mutate, isPending, error, data } = useApiMutation<
    CustomFilter,
    Partial<CustomFilter>
  >({
    path: id ? `/customFilter/${id}` : '/customFilter',
    method: id ? 'PUT' : 'POST',
    mutationOptions: {
      onSuccess: (saved) => syncCustomFilters({ saved }),
    },
  });

  return {
    saveCustomFilter: mutate,
    isSaving: isPending,
    saveError: error,
    newCustomFilter: data,
  };
};

// onDeleted runs before the feed drops the filter, so a page filtering by it can move
// off it first instead of rendering once with a selected filter that no longer exists.
export const useDeleteCustomFilter = (id: number, onDeleted?: () => void) => {
  const syncCustomFilters = useSyncCustomFilters();

  const { mutate, isPending, error } = useApiMutation<void, void>({
    path: `/customFilter/${id}`,
    method: 'DELETE',
    mutationOptions: {
      onSuccess: () => {
        onDeleted?.();
        syncCustomFilters({ deletedId: id });
      },
    },
  });

  return {
    deleteCustomFilter: mutate,
    isDeleting: isPending,
    deleteError: error,
  };
};
