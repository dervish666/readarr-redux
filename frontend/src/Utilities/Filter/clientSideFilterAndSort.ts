import _ from 'lodash';
import ModelBase from 'App/ModelBase';
import { CustomFilter, Filter } from 'Filters/Filter';
import { filterTypePredicates, filterTypes } from 'Helpers/Props';
import SortDirection from 'Helpers/Props/SortDirection';
import findSelectedFilters from 'Utilities/Filter/findSelectedFilters';

// Client side filter and sort for lists held in react-query, the TypeScript form of
// the redux selectors' filterCollection and sortCollection (both gone with them).
// Ported from Sonarr's Utilities/Filter/clientSideFilterAndSort.ts.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FilterPredicate<T> = (item: T, value: any, type: string) => boolean;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SortPredicate<T> = (item: T, direction: SortDirection) => any;

const typePredicates = filterTypePredicates as Record<
  string,
  (itemValue: unknown, filterValue: unknown) => boolean
>;

export interface ClientSideFilterAndSortOptions<T extends ModelBase> {
  selectedFilterKey?: string | number;
  filters?: Filter[];
  filterPredicates?: Record<string, FilterPredicate<T>>;
  customFilters?: CustomFilter[];
  sortKey: string;
  sortDirection: SortDirection;
  secondarySortKey?: string;
  secondarySortDirection?: SortDirection;
  sortPredicates?: Record<string, SortPredicate<T>>;
}

const getSortClause = <T>(
  sortKey: string,
  sortDirection: SortDirection,
  sortPredicates?: Record<string, SortPredicate<T>>
) => {
  if (sortPredicates && sortPredicates.hasOwnProperty(sortKey)) {
    return (item: T) => sortPredicates[sortKey](item, sortDirection);
  }

  return (item: T) => item[sortKey as keyof T];
};

export const filterItems = <T extends ModelBase>(
  data: ReadonlyArray<T>,
  options: Pick<
    ClientSideFilterAndSortOptions<T>,
    'selectedFilterKey' | 'filters' | 'customFilters' | 'filterPredicates'
  >
) => {
  const { selectedFilterKey, filters, customFilters, filterPredicates } =
    options;

  if (!selectedFilterKey) {
    return data;
  }

  const selectedFilters = findSelectedFilters(
    selectedFilterKey,
    filters,
    customFilters
  ) as Filter['filters'];

  return data.filter((item) => {
    return selectedFilters.every((selectedFilter) => {
      const { key, value, type = filterTypes.EQUAL } = selectedFilter;
      const isNegated =
        type === filterTypes.NOT_CONTAINS || type === filterTypes.NOT_EQUAL;

      if (filterPredicates && filterPredicates.hasOwnProperty(key)) {
        const predicate = filterPredicates[key];

        if (Array.isArray(value)) {
          const values = value as unknown[];

          return isNegated
            ? values.every((v) => predicate(item, v, type))
            : values.some((v) => predicate(item, v, type));
        }

        return predicate(item, value, type);
      }

      if (item.hasOwnProperty(key)) {
        const predicate = typePredicates[type];
        const itemValue = item[key as keyof T];

        if (Array.isArray(value)) {
          const values = value as unknown[];

          return isNegated
            ? values.every((v) => predicate(itemValue, v))
            : values.some((v) => predicate(itemValue, v));
        }

        return predicate(itemValue, value);
      }

      // Default to false if the filter can't be tested
      return false;
    });
  });
};

export const sortItems = <T extends ModelBase>(
  data: ReadonlyArray<T>,
  options: Pick<
    ClientSideFilterAndSortOptions<T>,
    | 'sortKey'
    | 'sortDirection'
    | 'secondarySortKey'
    | 'secondarySortDirection'
    | 'sortPredicates'
  >
) => {
  const {
    sortKey,
    sortDirection,
    sortPredicates,
    secondarySortKey,
    secondarySortDirection,
  } = options;

  const clauses = [getSortClause(sortKey, sortDirection, sortPredicates)];
  const orders: ('asc' | 'desc')[] = [
    sortDirection === SortDirection.Ascending ? 'asc' : 'desc',
  ];

  if (
    secondarySortKey &&
    secondarySortDirection &&
    (sortKey !== secondarySortKey || sortDirection !== secondarySortDirection)
  ) {
    clauses.push(
      getSortClause(secondarySortKey, secondarySortDirection, sortPredicates)
    );
    orders.push(
      secondarySortDirection === SortDirection.Ascending ? 'asc' : 'desc'
    );
  }

  return _.orderBy(data, clauses, orders);
};

const clientSideFilterAndSort = <T extends ModelBase>(
  data: ReadonlyArray<T>,
  options: ClientSideFilterAndSortOptions<T>
) => {
  return {
    data: sortItems(filterItems(data, options), options),
    totalItems: data.length,
  };
};

export default clientSideFilterAndSort;
