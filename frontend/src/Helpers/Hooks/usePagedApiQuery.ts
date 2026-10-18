import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { PropertyFilter } from 'App/State/AppState';
import SortDirection from 'Helpers/Props/SortDirection';
import fetchJson from 'Utilities/Fetch/fetchJson';
import getQueryPath from 'Utilities/Fetch/getQueryPath';
import getQueryString from 'Utilities/Fetch/getQueryString';
import { QueryOptions } from './useApiQuery';

// Readarr v1 PagingResource
export interface PagedQueryResponse<T> {
  page: number;
  pageSize: number;
  sortKey: string;
  sortDirection: string;
  totalRecords: number;
  totalPages: number;
  records: T[];
}

interface PagedQueryOptions<T> extends QueryOptions<PagedQueryResponse<T>> {
  page: number;
  pageSize: number;
  sortKey?: string;
  sortDirection?: SortDirection;
  filters?: PropertyFilter[];
}

const DEFAULT_RECORDS: never[] = [];

const usePagedApiQuery = <T>(options: PagedQueryOptions<T>) => {
  const { requestOptions, queryKey } = useMemo(() => {
    const {
      path,
      page,
      pageSize,
      sortKey,
      sortDirection,
      filters,
      queryParams,
      // queryOptions is pulled out so it doesn't reach fetch with the request options.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      queryOptions,
      ...otherOptions
    } = options;

    return {
      queryKey: [
        path,
        queryParams,
        page,
        pageSize,
        sortKey,
        sortDirection,
        filters,
      ],
      requestOptions: {
        ...otherOptions,
        path:
          getQueryPath(path) +
          getQueryString({
            ...queryParams,
            page,
            pageSize,
            sortKey,
            sortDirection,
            filters,
          }),
        headers: {
          ...options.headers,
          'X-Api-Key': window.Readarr.apiKey,
        },
      },
    };
  }, [options]);

  const { data, ...query } = useQuery({
    ...options.queryOptions,
    queryKey,
    queryFn: async ({ signal }) => {
      const response = await fetchJson<PagedQueryResponse<T>, unknown>({
        ...requestOptions,
        signal,
      });

      return {
        ...response,
        totalPages: Math.max(
          Math.ceil(response.totalRecords / options.pageSize),
          1
        ),
      };
    },
    placeholderData: keepPreviousData,
  });

  return {
    ...query,
    queryKey,
    records: data?.records ?? DEFAULT_RECORDS,
    totalRecords: data?.totalRecords ?? 0,
    totalPages: data?.totalPages ?? 0,
  };
};

export default usePagedApiQuery;
