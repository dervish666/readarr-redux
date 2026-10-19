import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import ModelBase from 'App/ModelBase';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import { Quality } from 'Quality/Quality';
import {
  useDeleteProvider,
  useManageProviderSettings,
  useProviderSettings,
} from 'Settings/useProviderSettings';
import { fetchQualityProfiles } from 'Store/Actions/settingsActions';

export interface QualityProfileFormatItem {
  format: number;
  name: string;
  score: number;
}

// v1 sends a single quality as { quality, items: [], allowed } and a group as
// { id, name, items, allowed } with no quality.
export interface QualityProfileQualityItem {
  quality: Quality;
  items: QualityProfileQualityItem[];
  allowed: boolean;
}

export interface QualityProfileGroup {
  id: number;
  name: string;
  items: QualityProfileQualityItem[];
  allowed: boolean;
}

export type QualityProfileItem =
  | QualityProfileQualityItem
  | QualityProfileGroup;

export type QualityProfileItems = QualityProfileItem[];

export interface QualityProfileModel extends ModelBase {
  name: string;
  upgradeAllowed: boolean;
  cutoff: number;
  items: QualityProfileItems;
  minFormatScore: number;
  cutoffFormatScore: number;
  formatItems: QualityProfileFormatItem[];
}

export function isQualityItem(
  item: QualityProfileItem
): item is QualityProfileQualityItem {
  return 'quality' in item && !!item.quality;
}

// The cutoff refers to a group by its id and to a single quality by the quality id.
export function getQualityProfileItemId(item: QualityProfileItem) {
  return isQualityItem(item) ? item.quality.id : item.id;
}

const PATH = '/qualityprofile';

const EMPTY_SCHEMA: QualityProfileModel = {
  id: 0,
  name: '',
  upgradeAllowed: false,
  cutoff: 0,
  items: [],
  minFormatScore: 0,
  cutoffFormatScore: 0,
  formatItems: [],
};

export const useQualityProfiles = () => {
  return useProviderSettings<QualityProfileModel>({ path: PATH });
};

export const useQualityProfile = (id: number | undefined) => {
  const { data } = useQualityProfiles();

  return useMemo(
    () => (id === undefined ? undefined : data.find((p) => p.id === id)),
    [data, id]
  );
};

export const useQualityProfileSchema = (enabled: boolean) => {
  const { isLoading, isFetched, error, data } =
    useApiQuery<QualityProfileModel>({
      path: `${PATH}/schema`,
      queryOptions: {
        enabled,
      },
    });

  return {
    isSchemaLoading: isLoading,
    isSchemaFetched: isFetched,
    schemaError: error,
    schema: data ?? EMPTY_SCHEMA,
  };
};

// Author, book, add-new, import list and editor pages still read the profiles from
// the redux feed, so every change refreshes it as well.
const useRefreshQualityProfilesFeed = () => {
  const dispatch = useDispatch();

  return useCallback(() => {
    dispatch(fetchQualityProfiles());
  }, [dispatch]);
};

export const useManageQualityProfile = (
  id: number | undefined,
  cloneId: number | undefined
) => {
  const isNew = !id && !cloneId;
  const { schema, isSchemaLoading, isSchemaFetched, schemaError } =
    useQualityProfileSchema(isNew);

  const profileToClone = useQualityProfile(cloneId);

  const defaultProfile = useMemo(() => {
    if (cloneId && profileToClone) {
      return {
        ...profileToClone,
        id: 0,
        name: `${profileToClone.name} - Copy`,
      };
    }

    return schema;
  }, [cloneId, profileToClone, schema]);

  const manage = useManageProviderSettings<QualityProfileModel>(
    id,
    defaultProfile,
    PATH,
    useRefreshQualityProfilesFeed()
  );

  return {
    ...manage,
    isSchemaLoading: isNew ? isSchemaLoading : false,
    isSchemaFetched: isNew ? isSchemaFetched : true,
    schemaError: isNew ? schemaError : null,
  };
};

export const useDeleteQualityProfile = (id: number) => {
  const result = useDeleteProvider<QualityProfileModel>(
    id,
    PATH,
    useRefreshQualityProfilesFeed()
  );

  return {
    ...result,
    deleteQualityProfile: result.deleteProvider,
  };
};
