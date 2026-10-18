import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { PropertyFilter } from 'App/State/AppState';
import useApiMutation from 'Helpers/Hooks/useApiMutation';
import usePage from 'Helpers/Hooks/usePage';
import usePagedApiQuery from 'Helpers/Hooks/usePagedApiQuery';
import { filterTypes } from 'Helpers/Props';
import History from 'typings/History';
import translate from 'Utilities/String/translate';
import { useHistoryOptions } from './historyOptionsStore';

export interface HistoryFilter {
  key: string;
  label: () => string;
  filters: PropertyFilter[];
}

// Readarr's EntityHistoryEventType values, which /history takes as eventType.
const eventTypeFilter = (value: string): PropertyFilter[] => [
  { key: 'eventType', value, type: filterTypes.EQUAL },
];

export const FILTERS: HistoryFilter[] = [
  {
    key: 'all',
    label: () => translate('All'),
    filters: [],
  },
  {
    key: 'grabbed',
    label: () => translate('Grabbed'),
    filters: eventTypeFilter('1'),
  },
  {
    key: 'bookFileImported',
    label: () => translate('BookImported'),
    filters: eventTypeFilter('3'),
  },
  {
    key: 'failed',
    label: () => translate('DownloadFailed'),
    filters: eventTypeFilter('4'),
  },
  {
    key: 'importFailed',
    label: () => translate('ImportFailed'),
    filters: eventTypeFilter('7'),
  },
  {
    key: 'deleted',
    label: () => translate('Deleted'),
    filters: eventTypeFilter('5'),
  },
  {
    key: 'renamed',
    label: () => translate('Renamed'),
    filters: eventTypeFilter('6'),
  },
  {
    key: 'retagged',
    label: () => translate('Retagged'),
    filters: eventTypeFilter('9'),
  },
  {
    key: 'ignored',
    label: () => translate('Ignored'),
    filters: eventTypeFilter('10'),
  },
];

const useHistory = () => {
  const { page, goToPage } = usePage('history');
  const { pageSize, selectedFilterKey, sortKey, sortDirection } =
    useHistoryOptions();

  const filters = useMemo(() => {
    return FILTERS.find((f) => f.key === selectedFilterKey)?.filters ?? [];
  }, [selectedFilterKey]);

  const { refetch, ...query } = usePagedApiQuery<History>({
    path: '/history',
    page,
    pageSize,
    filters,
    sortKey,
    sortDirection,
    // Rows carry their author and book, so history no longer waits on the redux lists.
    queryParams: {
      includeAuthor: true,
      includeBook: true,
    },
  });

  return {
    ...query,
    goToPage,
    page,
    refetch,
  };
};

export default useHistory;

export const useMarkAsFailed = (id: number) => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useApiMutation<unknown, void>({
    path: `/history/failed/${id}`,
    method: 'POST',
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/history'] });
      },
    },
  });

  return {
    markAsFailed: mutate,
    isMarkingAsFailed: isPending,
    markAsFailedError: error,
  };
};
