import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import useApiMutation from 'Helpers/Hooks/useApiMutation';
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

// NzbDrone.Core/ImportLists ImportListMonitorType, ImportListType and
// Books NewItemMonitorTypes, as v1 serialises them.
export type ImportListMonitorType = 'none' | 'specificBook' | 'entireAuthor';
export type ImportListType = 'program' | 'goodreads' | 'other';
export type NewItemMonitorType = 'all' | 'none' | 'new';

// Readarr.Api.V1/ImportLists/ImportListResource.
export interface ImportListModel extends Provider {
  enableAutomaticAdd: boolean;
  shouldMonitor: ImportListMonitorType;
  shouldMonitorExisting: boolean;
  shouldSearch: boolean;
  rootFolderPath: string;
  monitorNewItems: NewItemMonitorType;
  qualityProfileId: number;
  metadataProfileId: number;
  listType: ImportListType;
  listOrder: number;
  minRefreshInterval: string;
}

interface BulkEditImportListsPayload {
  ids: number[];
  [key: string]: unknown;
}

interface BulkDeleteImportListsPayload {
  ids: number[];
}

const PATH = '/importlist';

export const useImportLists = () => {
  return useProviderSettings<ImportListModel>({ path: PATH });
};

export const useImportListsData = () => {
  return useImportLists().data;
};

export const useSortedImportLists = () => {
  const result = useImportLists();

  const data = useMemo(
    () => sortProviders(result.data, 'name', 'ascending'),
    [result.data]
  );

  return { ...result, data };
};

// Tag details list the import lists using each tag.
const useRefreshTagDetails = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/tag/detail'] });
  }, [queryClient]);
};

export const useImportListSchema = (enabled: boolean = true) => {
  return useProviderSchema<ImportListModel>(PATH, enabled);
};

export const useManageImportList = (
  id: number | undefined,
  selectedSchema?: SelectedSchema
) => {
  const schema = useSelectedSchema<ImportListModel>(PATH, selectedSchema);
  const { schema: allSchemas } = useImportListSchema(selectedSchema != null);

  const defaultProvider = useMemo(() => {
    if (!selectedSchema || !schema) {
      return {} as ImportListModel;
    }

    // Presets carry no refresh interval of their own, so take the
    // implementation's (Sonarr's fix).
    const parent = selectedSchema.presetName
      ? allSchemas.find(
          (s) => s.implementation === selectedSchema.implementation
        )
      : undefined;

    return {
      ...schema,
      name: selectedSchema.presetName ?? schema.implementationName,
      minRefreshInterval:
        parent?.minRefreshInterval ?? schema.minRefreshInterval,
      // v1 leaves out a null root folder; the select picks the first one.
      rootFolderPath: schema.rootFolderPath ?? '',
      // The redux schema select's defaults.
      enableAutomaticAdd: true,
      shouldMonitor: 'entireAuthor' as ImportListMonitorType,
    };
  }, [schema, allSchemas, selectedSchema]);

  return useManageProviderSettings<ImportListModel>(
    id,
    defaultProvider,
    PATH,
    useRefreshTagDetails()
  );
};

export const useDeleteImportList = (id: number) => {
  const result = useDeleteProvider<ImportListModel>(
    id,
    PATH,
    useRefreshTagDetails()
  );

  return {
    ...result,
    deleteImportList: result.deleteProvider,
  };
};

export const useTestAllImportLists = () => {
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
    testAllImportLists: testAll,
    isTestingAllImportLists: isPending,
    testAllResults: data ?? errorResults,
    testAllError: errorResults ? null : error,
  };
};

export const useBulkEditImportLists = () => {
  const queryClient = useQueryClient();
  const refreshTagDetails = useRefreshTagDetails();

  const { mutate, isPending, error } = useApiMutation<
    ImportListModel[],
    BulkEditImportListsPayload
  >({
    path: `${PATH}/bulk`,
    method: 'PUT',
    mutationOptions: {
      onSuccess: (updated) => {
        queryClient.setQueryData<ImportListModel[]>([PATH], (oldData) =>
          oldData?.map((item) => updated.find((u) => u.id === item.id) ?? item)
        );
        refreshTagDetails();
      },
    },
  });

  return {
    bulkEditImportLists: mutate,
    isSaving: isPending,
    bulkError: error,
  };
};

export const useBulkDeleteImportLists = () => {
  const queryClient = useQueryClient();
  const refreshTagDetails = useRefreshTagDetails();

  const { mutate, isPending, error } = useApiMutation<
    void,
    BulkDeleteImportListsPayload
  >({
    path: `${PATH}/bulk`,
    method: 'DELETE',
    mutationOptions: {
      onSuccess: (_, { ids }) => {
        queryClient.setQueryData<ImportListModel[]>([PATH], (oldData) =>
          oldData?.filter((item) => !ids.includes(item.id))
        );
        refreshTagDetails();
      },
    },
  });

  return {
    bulkDeleteImportLists: mutate,
    isDeleting: isPending,
    bulkDeleteError: error,
  };
};
