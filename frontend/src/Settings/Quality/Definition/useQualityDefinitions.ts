import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import useApiMutation from 'Helpers/Hooks/useApiMutation';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import { usePendingItemsStore } from 'Helpers/Hooks/usePendingItemsStore';
import QualityDefinition from 'typings/QualityDefinition';

const PATH = '/qualitydefinition';
const DEFAULT_QUALITY_DEFINITIONS: QualityDefinition[] = [];

export const useQualityDefinitions = () => {
  const result = useApiQuery<QualityDefinition[]>({
    path: PATH,
  });

  return {
    ...result,
    data: result.data ?? DEFAULT_QUALITY_DEFINITIONS,
  };
};

// PUT /qualitydefinition/update takes the changed definitions. Its answer comes from
// the service's 5 second cache, which UpdateMany does not clear, so it can still hold
// the old values. The cache takes the definitions that were sent instead.
export const useSaveQualityDefinitions = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useApiMutation<
    QualityDefinition[],
    QualityDefinition[]
  >({
    path: `${PATH}/update`,
    method: 'PUT',
    mutationOptions: {
      onSuccess: (_response, sent) => {
        queryClient.setQueryData<QualityDefinition[]>([PATH], (oldData = []) =>
          oldData.map((item) => sent.find((s) => s.id === item.id) ?? item)
        );
        onSuccess?.();
      },
    },
  });

  return {
    save: mutate,
    isSaving: isPending,
    saveError: error,
  };
};

export const useManageQualityDefinitions = () => {
  const { data, isFetched, error } = useQualityDefinitions();
  const {
    setPendingItem,
    clearPendingItems,
    getItemsWithPendingChanges,
    getPendingChangesForSave,
    hasPendingChanges,
  } = usePendingItemsStore<QualityDefinition>();

  const { save, isSaving, saveError } =
    useSaveQualityDefinitions(clearPendingItems);

  const items = useMemo(
    () => getItemsWithPendingChanges(data),
    [data, getItemsWithPendingChanges]
  );

  const saveQualityDefinitions = useCallback(() => {
    const changed = getPendingChangesForSave(data);

    if (changed.length) {
      save(changed);
    }
  }, [data, getPendingChangesForSave, save]);

  const updateDefinition = useCallback(
    <K extends keyof QualityDefinition>(
      id: number,
      key: K,
      value: QualityDefinition[K]
    ) => {
      const originalItem = data.find((def) => def.id === id);
      setPendingItem(id, key, value, originalItem);
    },
    [data, setPendingItem]
  );

  return {
    items,
    hasPendingChanges,
    updateDefinition,
    saveQualityDefinitions,
    isFetched,
    isSaving,
    error,
    saveError,
  };
};
