import { UndefinedInitialDataOptions, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import fetchJson, {
  ApiError,
  FetchJsonOptions,
} from 'Utilities/Fetch/fetchJson';
import getQueryPath from 'Utilities/Fetch/getQueryPath';
import getQueryString, { QueryParams } from 'Utilities/Fetch/getQueryString';

export interface QueryOptions<T> extends FetchJsonOptions<unknown> {
  queryParams?: QueryParams;
  queryOptions?:
    | Omit<
        UndefinedInitialDataOptions<Readonly<T>, ApiError>,
        'queryKey' | 'queryFn'
      >
    | undefined;
}

const useApiQuery = <T>(options: QueryOptions<T>) => {
  const { queryKey, requestOptions } = useMemo(() => {
    // queryOptions is pulled out so it doesn't reach fetch with the request options.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { path: path, queryOptions, queryParams, ...otherOptions } = options;

    return {
      queryKey: queryParams ? [path, queryParams] : [path],
      requestOptions: {
        ...otherOptions,
        path: getQueryPath(path) + getQueryString(queryParams),
        headers: {
          ...options.headers,
          'X-Api-Key': window.Readarr.apiKey,
        },
      },
    };
  }, [options]);

  return {
    queryKey,
    ...useQuery({
      ...options.queryOptions,
      queryKey,
      queryFn: async ({ signal }) =>
        fetchJson<Readonly<T>, unknown>({ ...requestOptions, signal }),
    }),
  };
};

export default useApiQuery;
