import SortDirection from 'Helpers/Props/SortDirection';

type SortValue = string | number | boolean | null | undefined;

// Client-side sort for the provider lists and their manage tables: by sortKey,
// then by name. A predicate may stand in for a key (protocol sorts as "nzb").
function sortProviders<T extends { name: string }>(
  items: readonly T[],
  sortKey: string,
  sortDirection: SortDirection | `${SortDirection}`,
  predicates: Record<string, (item: T) => SortValue> = {}
) {
  const getValue = (item: T): SortValue => {
    const predicate = predicates[sortKey];

    if (predicate) {
      return predicate(item);
    }

    const value = (item as Record<string, unknown>)[sortKey];

    if (Array.isArray(value)) {
      return value.length;
    }

    return typeof value === 'string'
      ? value.toLowerCase()
      : (value as SortValue);
  };

  const direction = sortDirection === SortDirection.Descending ? -1 : 1;

  return [...items].sort((a, b) => {
    const aValue = getValue(a);
    const bValue = getValue(b);

    if (aValue !== bValue) {
      if (aValue == null) {
        return 1;
      }

      if (bValue == null) {
        return -1;
      }

      return (aValue > bValue ? 1 : -1) * direction;
    }

    return a.name.localeCompare(b.name);
  });
}

export default sortProviders;
