import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import DownloadProtocol from 'DownloadClient/DownloadProtocol';
import useApiMutation from 'Helpers/Hooks/useApiMutation';
import SortDirection from 'Helpers/Props/SortDirection';
import {
  getProviderTestAllResults,
  ProviderTestAllResult,
} from 'Settings/ProviderTestAllResult';
import sortProviders from 'Settings/sortProviders';
import {
  SelectedSchema,
  useProviderSchema,
  useSelectedSchema,
} from 'Settings/useProviderSchema';
import {
  useDeleteProvider,
  useManageProviderSettings,
  useProviderSettings,
} from 'Settings/useProviderSettings';
import Provider from 'typings/Provider';

// Readarr.Api.V1/DownloadClient/DownloadClientResource.
export interface DownloadClientModel extends Provider {
  enable: boolean;
  protocol: DownloadProtocol;
  priority: number;
  removeCompletedDownloads: boolean;
  removeFailedDownloads: boolean;
}

interface BulkEditDownloadClientsPayload {
  ids: number[];
  [key: string]: unknown;
}

interface BulkDeleteDownloadClientsPayload {
  ids: number[];
}

const PATH = '/downloadclient';

const SORT_PREDICATES = {
  name: (item: DownloadClientModel) => item.name.toLowerCase(),
  protocol: (item: DownloadClientModel) =>
    item.protocol === 'usenet' ? 'nzb' : item.protocol,
};

export const useDownloadClients = () => {
  return useProviderSettings<DownloadClientModel>({ path: PATH });
};

export const useDownloadClientsData = () => {
  return useDownloadClients().data;
};

export const useSortedDownloadClients = (
  sortKey: string = 'name',
  sortDirection: SortDirection | `${SortDirection}` = SortDirection.Ascending
) => {
  const result = useDownloadClients();

  const data = useMemo(
    () => sortProviders(result.data, sortKey, sortDirection, SORT_PREDICATES),
    [result.data, sortKey, sortDirection]
  );

  return { ...result, data };
};

// Tag details list the download clients using each tag.
const useRefreshTagDetails = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/tag/detail'] });
  }, [queryClient]);
};

export const useManageDownloadClient = (
  id: number | undefined,
  selectedSchema?: SelectedSchema
) => {
  const schema = useSelectedSchema<DownloadClientModel>(PATH, selectedSchema);

  const defaultProvider = useMemo(() => {
    if (selectedSchema && schema) {
      return {
        ...schema,
        name: selectedSchema.presetName ?? schema.implementationName,
        enable: true,
      };
    }

    return {} as DownloadClientModel;
  }, [schema, selectedSchema]);

  return useManageProviderSettings<DownloadClientModel>(
    id,
    defaultProvider,
    PATH,
    useRefreshTagDetails()
  );
};

export const useDeleteDownloadClient = (id: number) => {
  const result = useDeleteProvider<DownloadClientModel>(
    id,
    PATH,
    useRefreshTagDetails()
  );

  return {
    ...result,
    deleteDownloadClient: result.deleteProvider,
  };
};

export const useDownloadClientSchema = (enabled: boolean = true) => {
  return useProviderSchema<DownloadClientModel>(PATH, enabled);
};

export const useTestAllDownloadClients = () => {
  const { mutate, isPending, data, error } = useApiMutation<
    ProviderTestAllResult[],
    void
  >({
    path: `${PATH}/testall`,
    method: 'POST',
  });

  const errorResults = getProviderTestAllResults(error);

  // Toolbar buttons pass their click event; never send it as the body.
  const testAll = useCallback(() => mutate(), [mutate]);

  return {
    testAllDownloadClients: testAll,
    isTestingAllDownloadClients: isPending,
    testAllResults: data ?? errorResults,
    testAllError: errorResults ? null : error,
  };
};

export const useBulkEditDownloadClients = () => {
  const queryClient = useQueryClient();
  const refreshTagDetails = useRefreshTagDetails();

  const { mutate, isPending, error } = useApiMutation<
    DownloadClientModel[],
    BulkEditDownloadClientsPayload
  >({
    path: `${PATH}/bulk`,
    method: 'PUT',
    mutationOptions: {
      onSuccess: (updated) => {
        queryClient.setQueryData<DownloadClientModel[]>([PATH], (oldData) =>
          oldData?.map((item) => updated.find((u) => u.id === item.id) ?? item)
        );
        refreshTagDetails();
      },
    },
  });

  return {
    bulkEditDownloadClients: mutate,
    isSaving: isPending,
    bulkError: error,
  };
};

export const useBulkDeleteDownloadClients = () => {
  const queryClient = useQueryClient();
  const refreshTagDetails = useRefreshTagDetails();

  const { mutate, isPending, error } = useApiMutation<
    void,
    BulkDeleteDownloadClientsPayload
  >({
    path: `${PATH}/bulk`,
    method: 'DELETE',
    mutationOptions: {
      onSuccess: (_, { ids }) => {
        queryClient.setQueryData<DownloadClientModel[]>([PATH], (oldData) =>
          oldData?.filter((item) => !ids.includes(item.id))
        );
        refreshTagDetails();
      },
    },
  });

  return {
    bulkDeleteDownloadClients: mutate,
    isDeleting: isPending,
    bulkDeleteError: error,
  };
};
