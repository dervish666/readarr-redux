import { QueryKey, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import useApiMutation from 'Helpers/Hooks/useApiMutation';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import { sortItems } from 'Utilities/Filter/clientSideFilterAndSort';
import naturalExpansion from 'Utilities/String/naturalExpansion';
import InteractiveImport, { ManualImportUpdateItem } from './InteractiveImport';
import { useInteractiveImportOptions } from './interactiveImportOptionsStore';

// Manual import on react-query, ported from Sonarr's useInteractiveImport.ts with
// Readarr's v1 shapes. GET /manualimport lists the files of a folder or a download;
// POST /manualimport sends edited items back and answers them re-evaluated (new
// rejections, the matched book and edition). Nothing is imported until the
// ManualImport command runs.

const DEFAULT_ITEMS: InteractiveImport[] = [];

export interface InteractiveImportParams {
  folder?: string;
  downloadId?: string;
  authorId?: number;
  filterExistingFiles: boolean;
  replaceExistingFiles: boolean;
}

const SORT_PREDICATES = {
  path: (item: InteractiveImport) =>
    naturalExpansion(item.path.toLowerCase()) as string,
  author: (item: InteractiveImport) => item.author?.sortName ?? '',
  quality: (item: InteractiveImport) => item.qualityWeight || 0,
};

const useInteractiveImport = (params: InteractiveImportParams) => {
  const { sortKey, sortDirection } = useInteractiveImportOptions();

  const queryParams = useMemo(() => {
    const { folder, downloadId, authorId, ...flags } = params;

    return {
      ...(folder ? { folder } : {}),
      ...(downloadId ? { downloadId } : {}),
      ...(authorId ? { authorId } : {}),
      ...flags,
    };
  }, [params]);

  const { data, queryKey, isFetching, isFetched, isSuccess, error } =
    useApiQuery<InteractiveImport[]>({
      path: '/manualimport',
      queryParams,
      queryOptions: {
        // Dropped when the modal closes, so a reopen scans the folder again.
        gcTime: 0,
        refetchOnWindowFocus: false,
        // A refetch rescans the folder and throws away the author, book and quality picks made in the modal
        refetchOnReconnect: false,
        retry: false,
        enabled: !!(params.folder || params.downloadId),
      },
    });

  const items = (data as InteractiveImport[] | undefined) ?? DEFAULT_ITEMS;

  const sortedItems = useMemo(() => {
    return sortItems(items, {
      sortKey,
      sortDirection,
      secondarySortKey: 'path',
      secondarySortDirection: sortDirection,
      sortPredicates: SORT_PREDICATES,
    });
  }, [items, sortKey, sortDirection]);

  return {
    data: sortedItems,
    queryKey,
    isFetching,
    isFetched,
    isSuccess,
    error,
  };
};

export default useInteractiveImport;

export const useUpdateInteractiveImportItems = () => {
  const queryClient = useQueryClient();

  return useCallback(
    (ids: number[], updates: Partial<InteractiveImport>) => {
      queryClient.setQueriesData<InteractiveImport[]>(
        { queryKey: ['/manualimport'] },
        (oldData) => {
          if (!oldData) {
            return oldData;
          }

          return oldData.map((item) => {
            return ids.includes(item.id) ? { ...item, ...updates } : item;
          });
        }
      );
    },
    [queryClient]
  );
};

// The body the redux saveInteractiveImportItem thunk sent, plus the name the
// resource carries.
export function toUpdateItem(item: InteractiveImport): ManualImportUpdateItem {
  return {
    id: item.id,
    path: item.path,
    name: item.name,
    authorId: item.author?.id,
    bookId: item.book?.id,
    foreignEditionId: item.foreignEditionId || undefined,
    quality: item.quality,
    releaseGroup: item.releaseGroup,
    indexerFlags: item.indexerFlags,
    downloadId: item.downloadId,
    additionalFile: item.additionalFile,
    replaceExistingFiles: item.replaceExistingFiles,
    disableReleaseSwitching: item.disableReleaseSwitching,
  };
}

// Sends the given rows of the list under queryKey back to the server and writes the
// answers over them. Items the server adds (other files of a matched book) are not
// shown, as before.
export const useReprocessInteractiveImportItems = (queryKey: QueryKey) => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useApiMutation<
    InteractiveImport[],
    ManualImportUpdateItem[]
  >({
    path: '/manualimport',
    method: 'POST',
    mutationOptions: {
      onSuccess: (updatedItems) => {
        queryClient.setQueryData<InteractiveImport[]>(queryKey, (oldData) => {
          if (!oldData || !Array.isArray(updatedItems)) {
            return oldData;
          }

          const byId = new Map(updatedItems.map((item) => [item.id, item]));

          return oldData.map((item) => byId.get(item.id) ?? item);
        });
      },
    },
  });

  const reprocessInteractiveImportItems = useCallback(
    (ids: number[]) => {
      const currentData =
        queryClient.getQueryData<InteractiveImport[]>(queryKey);

      if (!currentData) {
        return;
      }

      const payload = ids.reduce<ManualImportUpdateItem[]>((acc, id) => {
        const item = currentData.find((i) => i.id === id);

        if (item) {
          acc.push(toUpdateItem(item));
        }

        return acc;
      }, []);

      if (payload.length) {
        mutate(payload);
      }
    },
    [queryClient, queryKey, mutate]
  );

  return {
    reprocessInteractiveImportItems,
    isReprocessing: isPending,
    reprocessError: error,
  };
};
