import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
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

// Readarr.Api.V1/Notifications/NotificationResource.
export interface NotificationModel extends Provider {
  link: string;
  onGrab: boolean;
  onReleaseImport: boolean;
  onUpgrade: boolean;
  onRename: boolean;
  onAuthorAdded: boolean;
  onAuthorDelete: boolean;
  onBookDelete: boolean;
  onBookFileDelete: boolean;
  onBookFileDeleteForUpgrade: boolean;
  onHealthIssue: boolean;
  onDownloadFailure: boolean;
  onImportFailure: boolean;
  onBookRetag: boolean;
  onApplicationUpdate: boolean;
  supportsOnGrab: boolean;
  supportsOnReleaseImport: boolean;
  supportsOnUpgrade: boolean;
  supportsOnRename: boolean;
  supportsOnAuthorAdded: boolean;
  supportsOnAuthorDelete: boolean;
  supportsOnBookDelete: boolean;
  supportsOnBookFileDelete: boolean;
  supportsOnBookFileDeleteForUpgrade: boolean;
  supportsOnHealthIssue: boolean;
  includeHealthWarnings: boolean;
  supportsOnDownloadFailure: boolean;
  supportsOnImportFailure: boolean;
  supportsOnBookRetag: boolean;
  supportsOnApplicationUpdate: boolean;
  testCommand?: string;
}

const PATH = '/notification';

export const useConnections = () => {
  return useProviderSettings<NotificationModel>({ path: PATH });
};

export const useConnectionsData = () => {
  return useConnections().data;
};

export const useSortedConnections = () => {
  const result = useConnections();

  const data = useMemo(
    () => sortProviders(result.data, 'name', 'ascending'),
    [result.data]
  );

  return { ...result, data };
};

// Tag details list the connections using each tag.
const useRefreshTagDetails = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/tag/detail'] });
  }, [queryClient]);
};

export const useManageConnection = (
  id: number | undefined,
  selectedSchema?: SelectedSchema
) => {
  const schema = useSelectedSchema<NotificationModel>(PATH, selectedSchema);

  // A new connection starts with every trigger it supports switched on, as the
  // redux schema select did.
  const defaultProvider = useMemo(() => {
    if (!selectedSchema || !schema) {
      return {} as NotificationModel;
    }

    return {
      ...schema,
      name: selectedSchema.presetName ?? schema.implementationName,
      onGrab: schema.supportsOnGrab,
      onReleaseImport: schema.supportsOnReleaseImport,
      onUpgrade: schema.supportsOnUpgrade,
      onRename: schema.supportsOnRename,
      onAuthorAdded: schema.supportsOnAuthorAdded,
      onAuthorDelete: schema.supportsOnAuthorDelete,
      onBookDelete: schema.supportsOnBookDelete,
      onBookFileDelete: schema.supportsOnBookFileDelete,
      onBookFileDeleteForUpgrade: schema.supportsOnBookFileDeleteForUpgrade,
      onHealthIssue: schema.supportsOnHealthIssue,
      onDownloadFailure: schema.supportsOnDownloadFailure,
      onImportFailure: schema.supportsOnImportFailure,
      onBookRetag: schema.supportsOnBookRetag,
      onApplicationUpdate: schema.supportsOnApplicationUpdate,
    };
  }, [schema, selectedSchema]);

  return useManageProviderSettings<NotificationModel>(
    id,
    defaultProvider,
    PATH,
    useRefreshTagDetails()
  );
};

export const useDeleteConnection = (id: number) => {
  const result = useDeleteProvider<NotificationModel>(
    id,
    PATH,
    useRefreshTagDetails()
  );

  return {
    ...result,
    deleteConnection: result.deleteProvider,
  };
};

export const useConnectionSchema = (enabled: boolean = true) => {
  return useProviderSchema<NotificationModel>(PATH, enabled);
};
