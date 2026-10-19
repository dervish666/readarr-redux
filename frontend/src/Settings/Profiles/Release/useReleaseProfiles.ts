import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import ModelBase from 'App/ModelBase';
import {
  useDeleteProvider,
  useManageProviderSettings,
  useProviderSettings,
} from 'Settings/useProviderSettings';

export interface ReleaseProfileModel extends ModelBase {
  enabled: boolean;
  required: string[];
  ignored: string[];
  indexerId: number;
  tags: number[];
}

const PATH = '/releaseprofile';

const NEW_RELEASE_PROFILE: ReleaseProfileModel = {
  id: 0,
  enabled: true,
  required: [],
  ignored: [],
  indexerId: 0,
  tags: [],
};

export const useReleaseProfiles = () => {
  return useProviderSettings<ReleaseProfileModel>({ path: PATH });
};

// Tag details count release profiles, so a change refreshes them too.
const useRefreshTagDetails = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/tag/detail'] });
  }, [queryClient]);
};

export const useManageReleaseProfile = (id: number | undefined) => {
  return useManageProviderSettings<ReleaseProfileModel>(
    id,
    NEW_RELEASE_PROFILE,
    PATH,
    useRefreshTagDetails()
  );
};

export const useDeleteReleaseProfile = (id: number) => {
  const result = useDeleteProvider<ReleaseProfileModel>(
    id,
    PATH,
    useRefreshTagDetails()
  );

  return {
    ...result,
    deleteReleaseProfile: result.deleteProvider,
  };
};
