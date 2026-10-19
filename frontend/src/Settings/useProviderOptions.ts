import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import fetchJson, { ApiError } from 'Utilities/Fetch/fetchJson';
import getQueryPath from 'Utilities/Fetch/getQueryPath';
import getQueryString, { QueryParams } from 'Utilities/Fetch/getQueryString';

// The settings a provider form edits, in the selectSettings shape: every property
// wrapped as { value, ... } except fields (a list) and, from react-query pages,
// implementationName (a plain string). Redux pages pass the same shape.
export type ProviderOptionsData = Record<string, unknown> & {
  fields?: { name: string; value: unknown }[];
};

export interface ProviderOptionsParams {
  provider: string;
  action: string;
  providerData: ProviderOptionsData;
  queryParams?: QueryParams;
  // Changes when the caller wants the options asked for again.
  requestKey?: unknown;
  enabled?: boolean;
}

const importantFieldNames = ['baseUrl', 'apiPath', 'apiKey', 'authToken'];

// The fields that decide what the provider's action returns, so a query only
// repeats when one of them changes.
export function getProviderDataKey(providerData: ProviderOptionsData) {
  if (!providerData || !providerData.fields) {
    return null;
  }

  return providerData.fields
    .filter((f) => importantFieldNames.includes(f.name))
    .map((f) => f.value);
}

function flattenProviderData(providerData: ProviderOptionsData) {
  return Object.keys(providerData).reduce<Record<string, unknown>>(
    (acc, key) => {
      const property = providerData[key];

      if (
        key !== 'fields' &&
        typeof property === 'object' &&
        property !== null &&
        'value' in property
      ) {
        acc[key] = (property as { value: unknown }).value;
      } else {
        acc[key] = property;
      }

      return acc;
    },
    {}
  );
}

// POST /{provider}/action/{action}: options a provider computes from its unsaved
// settings (Newznab categories, a remote Readarr's profiles, devices, shelves).
export default function useProviderOptions<T = unknown>({
  provider,
  action,
  providerData,
  queryParams,
  requestKey,
  enabled = true,
}: ProviderOptionsParams) {
  const flattenedData = useMemo(
    () => flattenProviderData(providerData),
    [providerData]
  );

  const path = `/${provider}/action/${action}`;

  return useQuery<T, ApiError>({
    queryKey: [path, queryParams ?? null, requestKey ?? null],
    enabled: enabled && !!(provider && action && providerData),
    queryFn: ({ signal }) =>
      fetchJson<T, Record<string, unknown>>({
        path: getQueryPath(path) + getQueryString(queryParams),
        method: 'POST',
        body: flattenedData,
        headers: {
          'X-Api-Key': window.Readarr.apiKey,
        },
        signal,
      }),
    placeholderData: keepPreviousData,
    // The answer depends on the unsaved form, so never reuse it across forms.
    gcTime: 0,
    staleTime: Infinity,
    retry: false,
  });
}
