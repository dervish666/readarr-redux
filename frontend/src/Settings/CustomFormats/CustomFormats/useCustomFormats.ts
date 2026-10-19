import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import ModelBase from 'App/ModelBase';
import { useProviderSchema } from 'Settings/useProviderSchema';
import {
  useDeleteProvider,
  useManageProviderSettings,
  useProviderSettings,
} from 'Settings/useProviderSettings';
import { fetchQualityProfiles } from 'Store/Actions/settingsActions';
import Field from 'typings/Field';
import translate from 'Utilities/String/translate';

// v1 CustomFormatSpecificationSchema. Conditions have no id of their own on the
// server; the UI numbers them so it can edit, clone and delete them in place.
export interface CustomFormatSpecification {
  id: number;
  name: string;
  implementation: string;
  implementationName: string;
  infoLink: string;
  negate: boolean;
  required: boolean;
  fields: Field[];
  presets?: CustomFormatSpecification[];
}

export interface CustomFormat extends ModelBase {
  name: string;
  includeCustomFormatWhenRenaming: boolean;
  specifications: CustomFormatSpecification[];
}

const PATH = '/customformat';

const DEFAULT_CUSTOM_FORMAT: CustomFormat = {
  id: 0,
  name: '',
  includeCustomFormatWhenRenaming: false,
  specifications: [],
};

export const useCustomFormats = () => {
  return useProviderSettings<CustomFormat>({
    path: PATH,
    queryOptions: {
      refetchOnWindowFocus: false,
    },
  });
};

export const useSortedCustomFormats = () => {
  const result = useCustomFormats();

  const sortedData = useMemo(
    () => [...result.data].sort((a, b) => a.name.localeCompare(b.name)),
    [result.data]
  );

  return { ...result, data: sortedData };
};

export const useCustomFormat = (id: number | undefined) => {
  const { data } = useCustomFormats();

  return useMemo(
    () => (id === undefined ? undefined : data.find((cf) => cf.id === id)),
    [data, id]
  );
};

// The server adds a new format to every quality profile (score 0), drops a deleted
// one from them, and offers each format's conditions as presets, so a change here
// refreshes the profiles (react-query and the redux feed) and the condition schema.
const useRefreshAfterCustomFormatChange = () => {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/qualityprofile'] });
    queryClient.invalidateQueries({ queryKey: ['/qualityprofile/schema'] });
    queryClient.invalidateQueries({ queryKey: [`${PATH}/schema`] });
    dispatch(fetchQualityProfiles());
  }, [queryClient, dispatch]);
};

export const useDeleteCustomFormat = (id: number) => {
  const result = useDeleteProvider<CustomFormat>(
    id,
    PATH,
    useRefreshAfterCustomFormatChange()
  );

  return {
    ...result,
    deleteCustomFormat: result.deleteProvider,
  };
};

export const useCustomFormatSchema = (enabled: boolean = true) => {
  return useProviderSchema<CustomFormatSpecification>(PATH, enabled);
};

function getNextSpecId(specifications: CustomFormatSpecification[]) {
  return specifications.length > 0
    ? Math.max(...specifications.map((s) => s.id)) + 1
    : 1;
}

export const useManageCustomFormat = (
  id: number | undefined,
  cloneId: number | undefined
) => {
  const cloneSource = useCustomFormat(cloneId);

  const defaultProvider = useMemo<CustomFormat>(() => {
    if (cloneId && cloneSource) {
      return {
        ...cloneSource,
        id: 0,
        name: translate('DefaultNameCopiedProfile', {
          name: cloneSource.name,
        }),
      };
    }

    return DEFAULT_CUSTOM_FORMAT;
  }, [cloneId, cloneSource]);

  const manage = useManageProviderSettings<CustomFormat>(
    id,
    defaultProvider,
    PATH,
    useRefreshAfterCustomFormatChange()
  );

  const { updateValue } = manage;
  const specificationsValue = manage.item.specifications.value;

  const specifications = useMemo(
    () =>
      (specificationsValue ?? []).map((spec, i) => ({
        ...spec,
        id: spec.id || i + 1,
      })),
    [specificationsValue]
  );

  const saveSpecification = useCallback(
    (spec: CustomFormatSpecification) => {
      if (spec.id > 0 && specifications.some((s) => s.id === spec.id)) {
        updateValue(
          'specifications',
          specifications.map((s) => (s.id === spec.id ? spec : s))
        );

        return;
      }

      updateValue('specifications', [
        ...specifications,
        { ...spec, id: getNextSpecId(specifications) },
      ]);
    },
    [specifications, updateValue]
  );

  const deleteSpecification = useCallback(
    (specId: number) => {
      updateValue(
        'specifications',
        specifications.filter((s) => s.id !== specId)
      );
    },
    [specifications, updateValue]
  );

  const cloneSpecification = useCallback(
    (specId: number) => {
      const spec = specifications.find((s) => s.id === specId);

      if (!spec) {
        return;
      }

      updateValue('specifications', [
        ...specifications,
        {
          ...spec,
          id: getNextSpecId(specifications),
          name: translate('DefaultNameCopiedSpecification', {
            name: spec.name,
          }),
        },
      ]);
    },
    [specifications, updateValue]
  );

  return {
    ...manage,
    saveCustomFormat: manage.saveProvider,
    specifications,
    saveSpecification,
    deleteSpecification,
    cloneSpecification,
  };
};
