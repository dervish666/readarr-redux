import { QueryClient, QueryKey } from '@tanstack/react-query';
import ModelBase from 'App/ModelBase';
import { QueryParams } from 'Utilities/Fetch/getQueryString';

// Helpers for list queries keyed [path] or [path, params] (see useApiQuery). They
// write every cached list under the path, so a change shows in all of them without a
// refetch. Prefix matching is by key element, so ['/book'] never touches ['/book/lookup'].

export type CachedListFilter<T> = (
  params: QueryParams | undefined,
  item: T
) => boolean;

function forEachList<T>(
  queryClient: QueryClient,
  path: string,
  getNewData: (queryKey: QueryKey, data: T[]) => T[] | undefined
) {
  queryClient
    .getQueriesData<T[]>({ queryKey: [path] })
    .forEach(([queryKey, data]) => {
      if (!Array.isArray(data)) {
        return;
      }

      const newData = getNewData(queryKey, data);

      if (newData && newData !== data) {
        queryClient.setQueryData(queryKey, newData);
      }
    });
}

// Merges each item into the lists that hold it. v1 leaves out null properties and some
// messages carry a partial resource (no statistics), so the cached fields survive.
// With belongsTo, an item missing from a list is added when the list's params match.
export function updateCachedItems<T extends ModelBase>(
  queryClient: QueryClient,
  path: string,
  items: ReadonlyArray<Partial<T> & ModelBase>,
  belongsTo?: CachedListFilter<T>
) {
  if (!items.length) {
    return;
  }

  forEachList<T>(queryClient, path, (queryKey, data) => {
    const params = queryKey[1] as QueryParams | undefined;
    const byId = new Map(items.map((item) => [item.id, item]));
    let changed = false;

    const newData = data.map((existing) => {
      const update = byId.get(existing.id);

      if (!update) {
        return existing;
      }

      byId.delete(existing.id);
      changed = true;

      return { ...existing, ...update };
    });

    if (belongsTo) {
      byId.forEach((item) => {
        if (belongsTo(params, item as T)) {
          newData.push(item as T);
          changed = true;
        }
      });
    }

    return changed ? newData : data;
  });
}

export function updateCachedItem<T extends ModelBase>(
  queryClient: QueryClient,
  path: string,
  item: Partial<T> & ModelBase,
  belongsTo?: CachedListFilter<T>
) {
  updateCachedItems<T>(queryClient, path, [item], belongsTo);
}

export function removeCachedItems<T extends ModelBase>(
  queryClient: QueryClient,
  path: string,
  shouldRemove: (item: T) => boolean
) {
  forEachList<T>(queryClient, path, (_queryKey, data) => {
    const newData = data.filter((item) => !shouldRemove(item));

    return newData.length === data.length ? data : newData;
  });
}

export function removeCachedItem<T extends ModelBase>(
  queryClient: QueryClient,
  path: string,
  id: number
) {
  removeCachedItems<T>(queryClient, path, (item) => item.id === id);
}

// True when a list query's numeric param (authorId, bookId) matches the value, or the
// list has no params (an unfiltered list holds everything).
export function paramMatches(
  params: QueryParams | undefined,
  key: string,
  value: number
) {
  if (!params) {
    return true;
  }

  const param = params[key];

  if (param == null) {
    return false;
  }

  if (Array.isArray(param)) {
    return (param as (number | string)[]).map(Number).includes(value);
  }

  return Number(param) === value;
}
