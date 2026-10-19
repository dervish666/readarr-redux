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
import translate from 'Utilities/String/translate';

// Readarr.Api.V1/Indexers/IndexerResource.
export interface IndexerModel extends Provider {
  enableRss: boolean;
  enableAutomaticSearch: boolean;
  enableInteractiveSearch: boolean;
  supportsRss: boolean;
  supportsSearch: boolean;
  protocol: DownloadProtocol;
  priority: number;
  downloadClientId: number;
}

interface BulkEditIndexersPayload {
  ids: number[];
  [key: string]: unknown;
}

interface BulkDeleteIndexersPayload {
  ids: number[];
}

const PATH = '/indexer';

const SORT_PREDICATES = {
  name: (item: IndexerModel) => item.name.toLowerCase(),
  protocol: (item: IndexerModel) =>
    item.protocol === 'usenet' ? 'nzb' : item.protocol,
};

export const useIndexers = () => {
  return useProviderSettings<IndexerModel>({ path: PATH });
};

export const useIndexersData = () => {
  return useIndexers().data;
};

export const useIndexer = (id: number | undefined) => {
  const data = useIndexersData();

  return id === undefined ? undefined : data.find((item) => item.id === id);
};

export const useSortedIndexers = (
  sortKey: string = 'name',
  sortDirection: SortDirection | `${SortDirection}` = SortDirection.Ascending
) => {
  const result = useIndexers();

  const data = useMemo(
    () => sortProviders(result.data, sortKey, sortDirection, SORT_PREDICATES),
    [result.data, sortKey, sortDirection]
  );

  return { ...result, data };
};

// Tag details list the indexers using each tag.
const useRefreshTagDetails = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/tag/detail'] });
  }, [queryClient]);
};

export const useManageIndexer = (
  id: number | undefined,
  cloneId: number | undefined,
  selectedSchema?: SelectedSchema
) => {
  const schema = useSelectedSchema<IndexerModel>(PATH, selectedSchema);
  const cloneIndexer = useIndexer(cloneId);

  const defaultProvider = useMemo(() => {
    if (cloneId && cloneIndexer) {
      return {
        ...cloneIndexer,
        id: 0,
        name: translate('DefaultNameCopiedProfile', {
          name: cloneIndexer.name,
        }),
        fields: cloneIndexer.fields.map((field) =>
          field.privacy === 'apiKey' || field.privacy === 'password'
            ? { ...field, value: '' }
            : field
        ),
      };
    }

    if (selectedSchema && schema) {
      return {
        ...schema,
        name: selectedSchema.presetName ?? schema.implementationName,
        enableRss: schema.supportsRss,
        enableAutomaticSearch: schema.supportsSearch,
        enableInteractiveSearch: schema.supportsSearch,
      };
    }

    return {} as IndexerModel;
  }, [cloneId, cloneIndexer, schema, selectedSchema]);

  return useManageProviderSettings<IndexerModel>(
    id,
    defaultProvider,
    PATH,
    useRefreshTagDetails()
  );
};

export const useDeleteIndexer = (id: number) => {
  const result = useDeleteProvider<IndexerModel>(
    id,
    PATH,
    useRefreshTagDetails()
  );

  return {
    ...result,
    deleteIndexer: result.deleteProvider,
  };
};

export const useIndexerSchema = (enabled: boolean = true) => {
  return useProviderSchema<IndexerModel>(PATH, enabled);
};

export const useTestAllIndexers = () => {
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
    testAllIndexers: testAll,
    isTestingAllIndexers: isPending,
    testAllResults: data ?? errorResults,
    testAllError: errorResults ? null : error,
  };
};

export const useBulkEditIndexers = () => {
  const queryClient = useQueryClient();
  const refreshTagDetails = useRefreshTagDetails();

  const { mutate, isPending, error } = useApiMutation<
    IndexerModel[],
    BulkEditIndexersPayload
  >({
    path: `${PATH}/bulk`,
    method: 'PUT',
    mutationOptions: {
      onSuccess: (updated) => {
        queryClient.setQueryData<IndexerModel[]>([PATH], (oldData) =>
          oldData?.map((item) => updated.find((u) => u.id === item.id) ?? item)
        );
        refreshTagDetails();
      },
    },
  });

  return {
    bulkEditIndexers: mutate,
    isSaving: isPending,
    bulkError: error,
  };
};

export const useBulkDeleteIndexers = () => {
  const queryClient = useQueryClient();
  const refreshTagDetails = useRefreshTagDetails();

  const { mutate, isPending, error } = useApiMutation<
    void,
    BulkDeleteIndexersPayload
  >({
    path: `${PATH}/bulk`,
    method: 'DELETE',
    mutationOptions: {
      onSuccess: (_, { ids }) => {
        queryClient.setQueryData<IndexerModel[]>([PATH], (oldData) =>
          oldData?.filter((item) => !ids.includes(item.id))
        );
        refreshTagDetails();
      },
    },
  });

  return {
    bulkDeleteIndexers: mutate,
    isDeleting: isPending,
    bulkDeleteError: error,
  };
};
