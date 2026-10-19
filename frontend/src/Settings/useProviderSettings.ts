import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import ModelBase from 'App/ModelBase';
import useApiMutation, {
  addOrUpdateQueryClientItem,
} from 'Helpers/Hooks/useApiMutation';
import useApiQuery, { QueryOptions } from 'Helpers/Hooks/useApiQuery';
import { usePendingChangesStore } from 'Helpers/Hooks/usePendingChangesStore';
import selectSettings from 'Utilities/selectSettings';

// A subset of Sonarr's Settings/useProviderSettings for list resources edited in a
// modal (profiles). Readarr's providers with fields and test buttons are not on
// react-query yet, so there is no field or test handling here.

export const useProviderSettings = <T extends ModelBase>(
  options: QueryOptions<T[]>
) => {
  const result = useApiQuery<T[]>(options);

  return {
    ...result,
    data: result.data ?? ([] as T[]),
  };
};

export const useProviderWithDefault = <T extends ModelBase>(
  id: number | undefined,
  defaultProvider: T,
  path: string
) => {
  const { data } = useProviderSettings<T>({ path });

  return useMemo(() => {
    if (!id) {
      return defaultProvider;
    }

    // Deleted from under an open modal (another tab, SignalR): keep the default
    // shape so the form still renders until the modal closes.
    return data.find((p) => p.id === id) ?? defaultProvider;
  }, [data, defaultProvider, id]);
};

export const useSaveProviderSettings = <T extends ModelBase>(
  id: number,
  path: string,
  onSuccess?: (saved: T) => void
) => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useApiMutation<T, T>({
    path: id ? `${path}/${id}` : path,
    method: id ? 'PUT' : 'POST',
    mutationOptions: {
      onSuccess: (saved) => {
        queryClient.setQueryData<T[]>([path], (oldData = []) =>
          addOrUpdateQueryClientItem(oldData, saved, 'id')
        );
        onSuccess?.(saved);
      },
    },
  });

  return {
    save: mutate,
    isSaving: isPending,
    saveError: error,
  };
};

export const useManageProviderSettings = <T extends ModelBase>(
  id: number | undefined,
  defaultProvider: T,
  path: string,
  onSaved?: (saved: T) => void
) => {
  const provider = useProviderWithDefault<T>(id, defaultProvider, path);

  const { pendingChanges, setPendingChange, clearPendingChanges } =
    usePendingChangesStore<T>({});

  const handleSaveSuccess = useCallback(
    (saved: T) => {
      clearPendingChanges();
      onSaved?.(saved);
    },
    [clearPendingChanges, onSaved]
  );

  const { save, isSaving, saveError } = useSaveProviderSettings<T>(
    provider.id,
    path,
    handleSaveSuccess
  );

  // Only keep changes that differ from the saved item, so setting a value back
  // clears it from the pending set.
  const changedValues = useMemo(() => {
    const changed: Partial<T> = {};

    (Object.keys(pendingChanges) as (keyof T)[]).forEach((key) => {
      if (provider[key] !== pendingChanges[key]) {
        changed[key] = pendingChanges[key];
      }
    });

    return changed;
  }, [provider, pendingChanges]);

  const { settings: item, ...settings } = useMemo(
    () => selectSettings<T>(provider, changedValues, saveError),
    [provider, changedValues, saveError]
  );

  const saveProvider = useCallback(() => {
    save({ ...provider, ...changedValues });
  }, [provider, changedValues, save]);

  const updateValue = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setPendingChange(key, value);
    },
    [setPendingChange]
  );

  return {
    ...settings,
    item,
    updateValue,
    saveProvider,
    isSaving,
    saveError,
  };
};

export const useDeleteProvider = <T extends ModelBase>(
  id: number,
  path: string,
  onDeleted?: () => void
) => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useApiMutation<void, void>({
    path: `${path}/${id}`,
    method: 'DELETE',
    mutationOptions: {
      onSuccess: () => {
        queryClient.setQueryData<T[]>([path], (oldData = []) =>
          oldData.filter((item) => item.id !== id)
        );
        onDeleted?.();
      },
    },
  });

  return {
    deleteProvider: mutate,
    isDeleting: isPending,
    deleteError: error,
  };
};
