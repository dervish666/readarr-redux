import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isEqual } from 'lodash';
import { useCallback, useMemo, useRef } from 'react';
import ModelBase from 'App/ModelBase';
import useApiMutation, {
  addOrUpdateQueryClientItem,
} from 'Helpers/Hooks/useApiMutation';
import useApiQuery, { QueryOptions } from 'Helpers/Hooks/useApiQuery';
import { usePendingChangesStore } from 'Helpers/Hooks/usePendingChangesStore';
import { usePendingFieldsStore } from 'Helpers/Hooks/usePendingFieldsStore';
import { PendingProviderSection, PendingSection } from 'typings/pending';
import Provider from 'typings/Provider';
import fetchJson, { ApiError } from 'Utilities/Fetch/fetchJson';
import getQueryPath from 'Utilities/Fetch/getQueryPath';
import getQueryString from 'Utilities/Fetch/getQueryString';
import selectSettings from 'Utilities/selectSettings';

// Sonarr's Settings/useProviderSettings, for list resources edited in a modal
// (profiles, remote path mappings) and for providers with fields and a Test
// button (indexers, download clients). Readarr's v1 provider endpoints take
// forceSave/forceTest rather than Sonarr's skipTesting/skipValidation, and keep
// the redux handlers' rule: sending the exact same data a second time forces it,
// which is how "save anyway" past warnings works.

const isProviderWithFields = (provider: unknown): provider is Provider => {
  return (
    typeof provider === 'object' &&
    provider !== null &&
    'fields' in provider &&
    Array.isArray((provider as Provider).fields)
  );
};

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

interface ProviderRequest<T> {
  data: T;
  force: boolean;
}

export const useSaveProviderSettings = <T extends ModelBase>(
  id: number,
  path: string,
  onSuccess?: (saved: T) => void
) => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error, submittedAt } = useMutation<
    T,
    ApiError,
    ProviderRequest<T>
  >({
    mutationFn: ({ data, force }) => {
      return fetchJson<T, T>({
        path:
          getQueryPath(id ? `${path}/${id}` : path) +
          getQueryString(force ? { forceSave: true } : undefined),
        method: id ? 'PUT' : 'POST',
        headers: {
          'X-Api-Key': window.Readarr.apiKey,
        },
        body: data,
      });
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<T[]>([path], (oldData = []) =>
        addOrUpdateQueryClientItem(oldData, saved, 'id')
      );
      onSuccess?.(saved);
    },
  });

  const save = useCallback(
    (data: T, force = false) => {
      mutate({ data, force });
    },
    [mutate]
  );

  return {
    save,
    isSaving: isPending,
    saveError: error,
    saveSubmittedAt: submittedAt,
  };
};

export const useTestProvider = <T extends ModelBase>(path: string) => {
  const { mutate, isPending, error, submittedAt } = useMutation<
    void,
    ApiError,
    ProviderRequest<T>
  >({
    mutationFn: ({ data, force }) => {
      return fetchJson<void, T>({
        path:
          getQueryPath(`${path}/test`) +
          getQueryString(force ? { forceTest: true } : undefined),
        method: 'POST',
        headers: {
          'X-Api-Key': window.Readarr.apiKey,
        },
        body: data,
      });
    },
  });

  const test = useCallback(
    (data: T, force = false) => {
      mutate({ data, force });
    },
    [mutate]
  );

  return {
    test,
    isTesting: isPending,
    testError: error,
    testSubmittedAt: submittedAt,
  };
};

type ManagedItem<T> = T extends Provider
  ? PendingProviderSection<T>
  : PendingSection<T>;

export const useManageProviderSettings = <T extends ModelBase>(
  id: number | undefined,
  defaultProvider: T,
  path: string,
  onSaved?: (saved: T) => void
) => {
  const provider = useProviderWithDefault<T>(id, defaultProvider, path);
  const lastSaveData = useRef<T | null>(null);
  const lastTestData = useRef<T | null>(null);

  const { pendingChanges, setPendingChange, clearPendingChanges } =
    usePendingChangesStore<T>({});

  const { pendingFields, setPendingFields, clearPendingFields } =
    usePendingFieldsStore();

  const handleSaveSuccess = useCallback(
    (saved: T) => {
      clearPendingChanges();
      clearPendingFields();
      lastSaveData.current = null;
      onSaved?.(saved);
    },
    [clearPendingChanges, clearPendingFields, onSaved]
  );

  const { save, isSaving, saveError, saveSubmittedAt } =
    useSaveProviderSettings<T>(provider.id, path, handleSaveSuccess);

  const { test, isTesting, testError, testSubmittedAt } =
    useTestProvider<T>(path);

  // The Test and Save buttons share one result: whichever ran last.
  const mutationError =
    saveSubmittedAt >= testSubmittedAt ? saveError : testError;

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

  const changedFields = useMemo(() => {
    const changed = new Map<string, unknown>();

    if (!isProviderWithFields(provider)) {
      return changed;
    }

    pendingFields.forEach((value, name) => {
      if (
        !isEqual(provider.fields.find((f) => f.name === name)?.value, value)
      ) {
        changed.set(name, value);
      }
    });

    return changed;
  }, [provider, pendingFields]);

  const { settings: item, ...settings } = useMemo(() => {
    const combinedPendingChanges = changedFields.size
      ? { ...changedValues, fields: Object.fromEntries(changedFields) }
      : changedValues;

    return selectSettings<T>(
      provider,
      combinedPendingChanges as Partial<T>,
      mutationError
    );
  }, [provider, changedValues, changedFields, mutationError]);

  const getUpdatedProvider = useCallback(() => {
    const updated: T = { ...provider, ...changedValues };

    if (isProviderWithFields(provider)) {
      return {
        ...updated,
        fields: provider.fields.map((field) =>
          changedFields.has(field.name)
            ? { ...field, value: changedFields.get(field.name) }
            : field
        ),
      } as T;
    }

    return updated;
  }, [provider, changedValues, changedFields]);

  const saveProvider = useCallback(() => {
    const data = getUpdatedProvider();
    const force = isEqual(data, lastSaveData.current);

    lastSaveData.current = data;
    save(data, force);
  }, [getUpdatedProvider, save]);

  const testProvider = useCallback(() => {
    const data = getUpdatedProvider();
    const force = isEqual(data, lastTestData.current);

    lastTestData.current = data;
    test(data, force);
  }, [getUpdatedProvider, test]);

  const updateValue = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setPendingChange(key, value);
    },
    [setPendingChange]
  );

  const updateFieldValue = useCallback(
    (fieldProperties: Record<string, unknown>) => {
      setPendingFields(fieldProperties);
    },
    [setPendingFields]
  );

  return {
    ...settings,
    hasPendingChanges: settings.hasPendingChanges || changedFields.size > 0,
    item: item as ManagedItem<T>,
    updateValue,
    updateFieldValue,
    saveProvider,
    isSaving,
    saveError: mutationError,
    testProvider,
    isTesting,
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
