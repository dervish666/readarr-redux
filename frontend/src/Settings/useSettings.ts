import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import useApiMutation from 'Helpers/Hooks/useApiMutation';
import useApiQuery, { QueryOptions } from 'Helpers/Hooks/useApiQuery';
import { usePendingChangesStore } from 'Helpers/Hooks/usePendingChangesStore';
import selectSettings from 'Utilities/selectSettings';

// Single-item config resources (/config/indexer, /config/ui, ...), edited on a page
// with a toolbar Save.
export const useSettings = <T extends object>(
  path: string,
  queryOptions?: QueryOptions<T>['queryOptions']
) => {
  const result = useApiQuery<T>({ path, queryOptions });

  return {
    ...result,
    data: result.data ?? ({} as T),
  };
};

// onSaved gets the saved resource, so a hook can copy it into a redux feed.
export const useSaveSettings = <T extends object>(
  path: string,
  onSaved?: (updatedSettings: T) => void
) => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useApiMutation<T, T>({
    path,
    method: 'PUT',
    mutationOptions: {
      onSuccess: (updatedSettings: T) => {
        queryClient.setQueryData<T>([path], updatedSettings);
        onSaved?.(updatedSettings);
      },
    },
  });

  return {
    save: mutate,
    isSaving: isPending,
    saveError: error,
  };
};

export const useManageSettings = <T extends object>(
  path: string,
  onSaved?: (updatedSettings: T) => void
) => {
  const { data, isFetching, isFetched, error, refetch } = useSettings<T>(path);
  const { pendingChanges, setPendingChange, clearPendingChanges } =
    usePendingChangesStore<T>({});

  const handleSaved = useCallback(
    (updatedSettings: T) => {
      clearPendingChanges();
      onSaved?.(updatedSettings);
    },
    [clearPendingChanges, onSaved]
  );

  const { save, isSaving, saveError } = useSaveSettings<T>(path, handleSaved);

  // Only the changes that differ from the saved values count as pending.
  const changedValues = useMemo(() => {
    const changed: Partial<T> = {};

    (Object.keys(pendingChanges) as (keyof T)[]).forEach((key) => {
      if (data[key] !== pendingChanges[key]) {
        changed[key] = pendingChanges[key];
      }
    });

    return changed;
  }, [data, pendingChanges]);

  const settings = useMemo(() => {
    return selectSettings<T>(data, changedValues, saveError);
  }, [data, changedValues, saveError]);

  const saveSettings = useCallback(() => {
    save({ ...data, ...changedValues });
  }, [data, changedValues, save]);

  const updateSetting = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setPendingChange(key, value);
    },
    [setPendingChange]
  );

  return {
    ...settings,
    pendingChanges: changedValues,
    updateSetting,
    saveSettings,
    clearPendingChanges,
    refetch,
    isFetching,
    isFetched,
    isSaving,
    error,
    saveError,
  };
};
