import { useMutation, useQueryClient } from '@tanstack/react-query';
import { omit } from 'lodash';
import { useCallback, useMemo, useRef, useState } from 'react';
import { usePendingChangesStore } from 'Helpers/Hooks/usePendingChangesStore';
import { useSettings } from 'Settings/useSettings';
import fetchJson, { ApiError } from 'Utilities/Fetch/fetchJson';
import getQueryPath from 'Utilities/Fetch/getQueryPath';
import selectSettings from 'Utilities/selectSettings';

// NzbDrone.Core/MetadataSource/MetadataSourceProbeService.
export type MetadataSourceProbeStatus =
  | 'ok'
  | 'notConfigured'
  | 'invalidUrl'
  | 'unreachable'
  | 'authFailure'
  | 'serverError'
  | 'rateLimited'
  | 'redirect'
  | 'responseTooLarge'
  | string;

// Readarr.Api.V1/Config/MetadataSourceProbeResource.
export interface MetadataSourceProbe {
  url: string;
  status: MetadataSourceProbeStatus;
  statusCode?: number;
  message: string;
  time: string;
  isOk: boolean;
}

// Readarr.Api.V1/Config/MetadataSourceConfigResource. The save answers with the
// probe it ran alongside the settings.
export interface MetadataSourceSettingsModel {
  id: number;
  metadataSource: string;
  probe?: MetadataSourceProbe;
}

export interface ProbeResult {
  probe: MetadataSourceProbe | null;
  // A save always goes through, so a failing source after a save is a warning.
  probeFromSave: boolean;
  testError: ApiError | null;
}

const PATH = '/config/metadatasource';

const EMPTY_RESULT: ProbeResult = {
  probe: null,
  probeFromSave: false,
  testError: null,
};

const request = <T>(path: string, method: string, body: object) =>
  fetchJson<T, object>({
    path: getQueryPath(path),
    method,
    headers: {
      'X-Api-Key': window.Readarr.apiKey,
    },
    body,
  });

export const useManageMetadataSourceSettings = () => {
  const queryClient = useQueryClient();
  const { data, isFetched, error } =
    useSettings<MetadataSourceSettingsModel>(PATH);

  const { pendingChanges, setPendingChange, clearPendingChanges } =
    usePendingChangesStore<MetadataSourceSettingsModel>({});

  const [result, setResult] = useState<ProbeResult>(EMPTY_RESULT);
  const latestTestId = useRef(0);

  const currentSource =
    pendingChanges.metadataSource ?? data.metadataSource ?? '';

  // Read by the save and test callbacks after a slow round trip, to tell whether
  // the address was edited in the meantime.
  const currentSourceRef = useRef(currentSource);
  currentSourceRef.current = currentSource;

  const {
    mutate: save,
    isPending: isSaving,
    error: saveError,
  } = useMutation<
    MetadataSourceSettingsModel,
    ApiError,
    MetadataSourceSettingsModel
  >({
    mutationFn: (body) => request(PATH, 'PUT', body),
    onSuccess: ({ probe, ...item }, submitted) => {
      queryClient.setQueryData([PATH], item);

      // The save can take as long as the server's probe of the address. An edit
      // made meanwhile is still pending, and the probe is about the old address,
      // so keep the one and drop the other.
      if (currentSourceRef.current !== submitted.metadataSource) {
        return;
      }

      clearPendingChanges();
      setResult({ probe: probe ?? null, probeFromSave: true, testError: null });
    },
  });

  const { mutate: test, isPending: isTesting } = useMutation<
    MetadataSourceProbe,
    ApiError,
    { metadataSource: string; testId: number }
  >({
    mutationFn: ({ metadataSource }) =>
      request(`${PATH}/test`, 'POST', { metadataSource }),
    onSettled: (probe, testError, { metadataSource, testId }) => {
      // A slow test can finish after the address was edited or tested again.
      // Its result would then sit under an address it wasn't run against.
      if (
        testId !== latestTestId.current ||
        currentSourceRef.current !== metadataSource
      ) {
        return;
      }

      setResult({
        probe: testError ? null : probe ?? null,
        probeFromSave: false,
        testError: testError ?? null,
      });
    },
  });

  const changedValues = useMemo(() => {
    return pendingChanges.metadataSource !== undefined &&
      pendingChanges.metadataSource !== data.metadataSource
      ? { metadataSource: pendingChanges.metadataSource }
      : {};
  }, [data, pendingChanges]);

  const settings = useMemo(() => {
    // The probe is shown on its own, not edited.
    const item = omit(data, 'probe') as MetadataSourceSettingsModel;

    return selectSettings<MetadataSourceSettingsModel>(
      item,
      changedValues,
      saveError
    );
  }, [data, changedValues, saveError]);

  const updateMetadataSource = useCallback(
    (value: string) => {
      setPendingChange('metadataSource', value);
      // A new address makes the last result stale.
      setResult(EMPTY_RESULT);
    },
    [setPendingChange]
  );

  const saveSettings = useCallback(() => {
    save({ id: data.id ?? 1, metadataSource: currentSource });
  }, [data, currentSource, save]);

  const testMetadataSource = useCallback(() => {
    latestTestId.current += 1;
    setResult((previous) => ({ ...previous, testError: null }));
    test({ metadataSource: currentSource, testId: latestTestId.current });
  }, [currentSource, test]);

  return {
    ...settings,
    isFetched,
    error,
    isSaving,
    isTesting,
    ...result,
    updateMetadataSource,
    saveSettings,
    testMetadataSource,
  };
};
