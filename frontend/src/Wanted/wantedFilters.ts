import { Filter } from 'Filters/Filter';
import { filterTypes } from 'Helpers/Props';
import getFilterValue from 'Utilities/Filter/getFilterValue';
import translate from 'Utilities/String/translate';

// GET /wanted/missing and /wanted/cutoff take monitored=true|false (true when left out).
export const FILTERS: Filter[] = [
  {
    key: 'monitored',
    label: () => translate('Monitored'),
    filters: [
      {
        key: 'monitored',
        value: true,
        type: filterTypes.EQUAL,
      },
    ],
  },
  {
    key: 'unmonitored',
    label: () => translate('Unmonitored'),
    filters: [
      {
        key: 'monitored',
        value: false,
        type: filterTypes.EQUAL,
      },
    ],
  },
];

export function getWantedFilters(selectedFilterKey: string | number) {
  return FILTERS.find((f) => f.key === selectedFilterKey)?.filters ?? [];
}

export function isShowingMonitored(selectedFilterKey: string | number) {
  return !!getFilterValue(FILTERS, selectedFilterKey, 'monitored', false);
}
