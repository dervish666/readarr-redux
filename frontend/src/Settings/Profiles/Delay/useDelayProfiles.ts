import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import ModelBase from 'App/ModelBase';
import {
  useDeleteProvider,
  useManageProviderSettings,
  useProviderSettings,
} from 'Settings/useProviderSettings';
import fetchJson, { ApiError } from 'Utilities/Fetch/fetchJson';
import getQueryPath from 'Utilities/Fetch/getQueryPath';
import getQueryString from 'Utilities/Fetch/getQueryString';

export interface DelayProfileModel extends ModelBase {
  enableUsenet: boolean;
  enableTorrent: boolean;
  preferredProtocol: 'usenet' | 'torrent';
  usenetDelay: number;
  torrentDelay: number;
  bypassIfHighestQuality: boolean;
  bypassIfAboveCustomFormatScore: boolean;
  minimumCustomFormatScore: number;
  order: number;
  tags: number[];
}

interface ReorderDelayProfilePayload {
  id: number;
  afterId?: number;
}

const PATH = '/delayprofile';

// The default profile always has id 1 and sorts last.
export const DEFAULT_DELAY_PROFILE_ID = 1;

const NEW_DELAY_PROFILE: DelayProfileModel = {
  id: 0,
  enableUsenet: true,
  enableTorrent: true,
  preferredProtocol: 'usenet',
  usenetDelay: 0,
  torrentDelay: 0,
  bypassIfHighestQuality: false,
  bypassIfAboveCustomFormatScore: false,
  minimumCustomFormatScore: 0,
  order: 0,
  tags: [],
};

export const useDelayProfiles = () => {
  return useProviderSettings<DelayProfileModel>({ path: PATH });
};

export const useSortedDelayProfiles = () => {
  const result = useDelayProfiles();

  const { defaultProfile, items } = useMemo(() => {
    const sorted = [...result.data].sort((a, b) => a.order - b.order);

    return {
      defaultProfile:
        sorted.find((item) => item.id === DEFAULT_DELAY_PROFILE_ID) ?? null,
      items: sorted.filter((item) => item.id !== DEFAULT_DELAY_PROFILE_ID),
    };
  }, [result.data]);

  return { ...result, defaultProfile, items };
};

// Tag details count delay profiles, so every change refreshes them too.
const useRefreshTagDetails = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/tag/detail'] });
  }, [queryClient]);
};

export const useManageDelayProfile = (id: number | undefined) => {
  return useManageProviderSettings<DelayProfileModel>(
    id,
    NEW_DELAY_PROFILE,
    PATH,
    useRefreshTagDetails()
  );
};

export const useDeleteDelayProfile = (id: number) => {
  const result = useDeleteProvider<DelayProfileModel>(
    id,
    PATH,
    useRefreshTagDetails()
  );

  return {
    ...result,
    deleteDelayProfile: result.deleteProvider,
  };
};

export const useReorderDelayProfile = () => {
  const queryClient = useQueryClient();
  const refreshTagDetails = useRefreshTagDetails();

  const { mutate, isPending, error } = useMutation<
    DelayProfileModel[],
    ApiError,
    ReorderDelayProfilePayload
  >({
    mutationFn: ({ id, afterId }) => {
      return fetchJson<DelayProfileModel[], void>({
        path:
          getQueryPath(`${PATH}/reorder/${id}`) +
          getQueryString(afterId == null ? {} : { afterId }),
        method: 'PUT',
        headers: {
          'X-Api-Key': window.Readarr.apiKey,
        },
      });
    },
    onSuccess: (reordered) => {
      // The reorder endpoint returns every profile with its new order.
      queryClient.setQueryData<DelayProfileModel[]>([PATH], reordered);
      refreshTagDetails();
    },
  });

  return {
    reorderDelayProfile: mutate,
    isReordering: isPending,
    reorderError: error,
  };
};
