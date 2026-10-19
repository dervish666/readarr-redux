import ModelBase from 'App/ModelBase';
import {
  useDeleteProvider,
  useManageProviderSettings,
  useProviderSettings,
} from 'Settings/useProviderSettings';

// Readarr.Api.V1/RemotePathMappings/RemotePathMappingResource.
export interface RemotePathMappingModel extends ModelBase {
  host: string;
  remotePath: string;
  localPath: string;
}

const PATH = '/remotepathmapping';

const NEW_REMOTE_PATH_MAPPING: RemotePathMappingModel = {
  id: 0,
  host: '',
  remotePath: '',
  localPath: '',
};

export const useRemotePathMappings = () => {
  return useProviderSettings<RemotePathMappingModel>({ path: PATH });
};

export const useManageRemotePathMapping = (id: number | undefined) => {
  return useManageProviderSettings<RemotePathMappingModel>(
    id,
    NEW_REMOTE_PATH_MAPPING,
    PATH
  );
};

export const useDeleteRemotePathMapping = (id: number) => {
  const result = useDeleteProvider<RemotePathMappingModel>(id, PATH);

  return {
    ...result,
    deleteRemotePathMapping: result.deleteProvider,
  };
};
