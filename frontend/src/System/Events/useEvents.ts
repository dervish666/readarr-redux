import { useMemo } from 'react';
import { PropertyFilter } from 'App/State/AppState';
import usePage from 'Helpers/Hooks/usePage';
import usePagedApiQuery from 'Helpers/Hooks/usePagedApiQuery';
import { filterTypes } from 'Helpers/Props';
import LogEvent from 'typings/LogEvent';
import translate from 'Utilities/String/translate';
import { useEventOptions } from './eventOptionsStore';

export interface EventFilter {
  key: string;
  label: () => string;
  filters: PropertyFilter[];
}

const levelFilter = (value: string): PropertyFilter[] => [
  { key: 'level', value, type: filterTypes.EQUAL },
];

export const FILTERS: EventFilter[] = [
  {
    key: 'all',
    label: () => translate('All'),
    filters: [],
  },
  {
    key: 'info',
    label: () => translate('Info'),
    filters: levelFilter('info'),
  },
  {
    key: 'warn',
    label: () => translate('Warn'),
    filters: levelFilter('warn'),
  },
  {
    key: 'error',
    label: () => translate('Error'),
    filters: levelFilter('error'),
  },
];

const useEvents = () => {
  const { page, goToPage } = usePage('events');
  const { pageSize, selectedFilterKey, sortKey, sortDirection } =
    useEventOptions();

  const filters = useMemo(() => {
    return FILTERS.find((f) => f.key === selectedFilterKey)?.filters ?? [];
  }, [selectedFilterKey]);

  const { refetch, ...query } = usePagedApiQuery<LogEvent>({
    path: '/log',
    page,
    pageSize,
    filters,
    sortKey,
    sortDirection,
  });

  return {
    ...query,
    goToPage,
    page,
    refetch,
  };
};

export default useEvents;
