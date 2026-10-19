import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import ModelBase from 'App/ModelBase';
import AppState from 'App/State/AppState';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import {
  useDeleteProvider,
  useManageProviderSettings,
  useProviderSettings,
} from 'Settings/useProviderSettings';
import { fetchMetadataProfiles } from 'Store/Actions/settingsActions';
import translate from 'Utilities/String/translate';

export interface MetadataProfileModel extends ModelBase {
  name: string;
  minPopularity: number;
  skipMissingDate: boolean;
  skipMissingIsbn: boolean;
  skipPartsAndSets: boolean;
  skipSeriesSecondary: boolean;
  allowedLanguages: string;
  minPages: number;
  ignored: string[];
}

const PATH = '/metadataprofile';

// v1 leaves null properties out of the JSON, so the schema has no name. Every field
// the form shows needs a key for selectSettings to give it a setting.
const NEW_PROFILE: MetadataProfileModel = {
  id: 0,
  name: '',
  minPopularity: 0,
  skipMissingDate: false,
  skipMissingIsbn: false,
  skipPartsAndSets: false,
  skipSeriesSecondary: false,
  allowedLanguages: '',
  minPages: 0,
  ignored: [],
};

export const useMetadataProfiles = () => {
  return useProviderSettings<MetadataProfileModel>({ path: PATH });
};

export const useMetadataProfile = (id: number | undefined) => {
  const { data } = useMetadataProfiles();

  return id ? data.find((profile) => profile.id === id) : undefined;
};

// Author, book, add-new and import list pages still read the redux feed.
const useRefreshMetadataProfilesFeed = () => {
  const dispatch = useDispatch();

  return useCallback(() => {
    dispatch(fetchMetadataProfiles());
  }, [dispatch]);
};

export const useMetadataProfileSchema = (enabled: boolean) => {
  const { isFetched, error, data } = useApiQuery<MetadataProfileModel>({
    path: `${PATH}/schema`,
    queryOptions: {
      enabled,
    },
  });

  return {
    isSchemaFetched: isFetched,
    schemaError: error,
    schema: data,
  };
};

export const useManageMetadataProfile = (
  id: number | undefined,
  cloneId: number | undefined
) => {
  const needsSchema = !id && !cloneId;
  const { isSchemaFetched, schemaError, schema } =
    useMetadataProfileSchema(needsSchema);

  const cloneProfile = useMetadataProfile(cloneId);

  const defaultProfile = useMemo(() => {
    if (cloneProfile) {
      return {
        ...cloneProfile,
        id: 0,
        name: translate('DefaultNameCopiedProfile', {
          name: cloneProfile.name,
        }),
      };
    }

    return { ...NEW_PROFILE, ...schema };
  }, [cloneProfile, schema]);

  const manage = useManageProviderSettings<MetadataProfileModel>(
    id,
    defaultProfile,
    PATH,
    useRefreshMetadataProfilesFeed()
  );

  return {
    ...manage,
    isSchemaFetched: needsSchema ? isSchemaFetched : true,
    schemaError: needsSchema ? schemaError : null,
  };
};

export const useDeleteMetadataProfile = (id: number) => {
  const result = useDeleteProvider<MetadataProfileModel>(
    id,
    PATH,
    useRefreshMetadataProfilesFeed()
  );

  return {
    ...result,
    deleteMetadataProfile: result.deleteProvider,
  };
};

// Authors and import lists are still redux, as createProfileInUseSelector read them.
export const useMetadataProfileInUse = (id: number | undefined) => {
  return useSelector((state: AppState) => {
    if (!id) {
      return false;
    }

    return (
      state.authors.items.some((author) => author.metadataProfileId === id) ||
      state.settings.importLists.items.some(
        (list) => list.metadataProfileId === id
      )
    );
  });
};
