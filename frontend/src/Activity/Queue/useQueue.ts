import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import useApiMutation from 'Helpers/Hooks/useApiMutation';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import usePage from 'Helpers/Hooks/usePage';
import usePagedApiQuery from 'Helpers/Hooks/usePagedApiQuery';
import Queue, {
  QueueImportDestination,
  QueueImportOptions,
} from 'typings/Queue';
import fetchJson, { ApiError } from 'Utilities/Fetch/fetchJson';
import getQueryPath from 'Utilities/Fetch/getQueryPath';
import getQueryString from 'Utilities/Fetch/getQueryString';
import { useQueueOptions } from './queueOptionsStore';

export interface QueueRemovalOptions {
  remove: boolean;
  changeCategory: boolean;
  blocklist: boolean;
  skipRedownload: boolean;
}

interface BulkQueueData {
  ids: number[];
}

// After a queue change, refresh the queue page, sidebar count and queue details.
const useRefreshQueue = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/queue'] });
    queryClient.invalidateQueries({ queryKey: ['/queue/status'] });
    queryClient.invalidateQueries({ queryKey: ['/queue/details'] });
  }, [queryClient]);
};

const getRemovalQueryString = (options: QueueRemovalOptions) => {
  return getQueryString({
    removeFromClient: options.remove,
    blocklist: options.blocklist,
    skipRedownload: options.skipRedownload,
    changeCategory: options.changeCategory,
  });
};

const useQueue = () => {
  const { page, goToPage } = usePage('queue');
  const { pageSize, sortKey, sortDirection, includeUnknownAuthorItems } =
    useQueueOptions();

  const { refetch, ...query } = usePagedApiQuery<Queue>({
    path: '/queue',
    page,
    pageSize,
    sortKey,
    sortDirection,
    queryParams: {
      includeUnknownAuthorItems,
      includeAuthor: true,
      includeBook: true,
    },
  });

  return {
    ...query,
    goToPage,
    page,
    refetch,
  };
};

export default useQueue;

// The removal options travel in the query string, which differs per call, so these
// two build their request themselves instead of going through useApiMutation.
const useRemoveMutation = <TData>() => {
  const refreshQueue = useRefreshQueue();

  return useMutation<unknown, ApiError, { path: string; body?: TData }>({
    mutationFn: ({ path, body }) =>
      fetchJson<unknown, TData>({
        path: getQueryPath(path),
        method: 'DELETE',
        body,
        headers: { 'X-Api-Key': window.Readarr.apiKey },
      }),
    onSuccess: refreshQueue,
  });
};

export const useRemoveQueueItem = (id: number) => {
  const { mutate, isPending } = useRemoveMutation<never>();

  const removeQueueItem = useCallback(
    (options: QueueRemovalOptions) => {
      mutate({ path: `/queue/${id}${getRemovalQueryString(options)}` });
    },
    [id, mutate]
  );

  return {
    removeQueueItem,
    isRemoving: isPending,
  };
};

export const useRemoveQueueItems = () => {
  const { mutate, isPending } = useRemoveMutation<BulkQueueData>();

  const removeQueueItems = useCallback(
    (ids: number[], options: QueueRemovalOptions) => {
      mutate({
        path: `/queue/bulk${getRemovalQueryString(options)}`,
        body: { ids },
      });
    },
    [mutate]
  );

  return {
    removeQueueItems,
    isRemoving: isPending,
  };
};

export const useGrabQueueItem = (id: number) => {
  const refreshQueue = useRefreshQueue();

  const { mutate, isPending, error } = useApiMutation<unknown, void>({
    path: `/queue/grab/${id}`,
    method: 'POST',
    mutationOptions: {
      onSuccess: refreshQueue,
    },
  });

  return {
    grabQueueItem: mutate,
    isGrabbing: isPending,
    grabError: error,
  };
};

export const useGrabQueueItems = () => {
  const refreshQueue = useRefreshQueue();

  const { mutate, isPending } = useApiMutation<unknown, BulkQueueData>({
    path: '/queue/grab/bulk',
    method: 'POST',
    mutationOptions: {
      onSuccess: refreshQueue,
    },
  });

  return {
    grabQueueItems: mutate,
    isGrabbing: isPending,
  };
};

// PR #19: import a blocked download anyway, or replace what is already at the destination.
export const useImportQueueItem = (id: number) => {
  const refreshQueue = useRefreshQueue();

  const { mutate, isPending, error, reset } = useApiMutation<
    unknown,
    QueueImportOptions
  >({
    path: `/queue/${id}/import`,
    method: 'POST',
    mutationOptions: {
      onSuccess: refreshQueue,
    },
  });

  return {
    importQueueItem: mutate,
    isImporting: isPending,
    importError: error,
    resetImport: reset,
  };
};

// PR #19: where each file of a blocked download would land, for the Compare modal.
export const useImportDestinations = (id: number) => {
  return useApiQuery<QueueImportDestination[]>({
    path: `/queue/${id}/destinations`,
    queryOptions: {
      // Always read the disk afresh when the modal opens, but not again on every window focus: each read
      // identifies the whole download, tags and all.
      gcTime: 0,
      staleTime: 0,
      refetchOnWindowFocus: false,
    },
  });
};
