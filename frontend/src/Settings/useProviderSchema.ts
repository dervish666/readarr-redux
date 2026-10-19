import { useMemo } from 'react';
import ModelBase from 'App/ModelBase';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import Provider from 'typings/Provider';

export interface SelectedSchema {
  implementation: string;
  implementationName: string;
  presetName?: string;
}

export const useProviderSchema = <T extends ModelBase>(
  path: string,
  enabled: boolean = true
) => {
  const { isLoading, isFetched, error, data } = useApiQuery<T[]>({
    path: `${path}/schema`,
    queryOptions: {
      enabled,
    },
  });

  return {
    isSchemaLoading: isLoading,
    isSchemaFetched: isFetched,
    schemaError: error,
    schema: data ?? ([] as T[]),
  };
};

// The schema (or one of its presets) the add modal picked, or undefined until the
// schema list has loaded.
export const useSelectedSchema = <T extends Provider>(
  path: string,
  selectedSchema: SelectedSchema | undefined
) => {
  const { schema } = useProviderSchema<T>(path, selectedSchema != null);

  return useMemo(() => {
    if (!selectedSchema) {
      return undefined;
    }

    const selected = schema.find(
      (s) => s.implementation === selectedSchema.implementation
    );

    if (!selected || selectedSchema.presetName == null) {
      return selected;
    }

    // A preset is a complete resource with its own name, fields and flags.
    const preset = (selected.presets as T[] | undefined)?.find(
      (p) => p.name === selectedSchema.presetName
    );

    return preset ?? selected;
  }, [schema, selectedSchema]);
};
