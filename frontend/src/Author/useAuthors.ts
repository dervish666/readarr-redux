import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { Filter, FilterBuilderProp } from 'Filters/Filter';
import useApiMutation from 'Helpers/Hooks/useApiMutation';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import {
  filterBuilderTypes,
  filterBuilderValueTypes,
  filterTypePredicates,
} from 'Helpers/Props';
import dateFilterPredicate from 'Utilities/Date/dateFilterPredicate';
import apiRequest from 'Utilities/Fetch/apiRequest';
import { ApiError } from 'Utilities/Fetch/fetchJson';
import {
  CachedListFilter,
  removeCachedItems,
  updateCachedItems,
} from 'Utilities/Fetch/queryCache';
import translate from 'Utilities/String/translate';
import Author, { AuthorMonitor, NewItemMonitorType } from './Author';

// Authors on react-query: the whole list is one query, ['/author'] (v1 has no paged
// author list). Single authors, the index and the pages built on it read from it.
// Ported from Sonarr's Series/useSeries.ts with Readarr's v1 fields.

export const AUTHORS_QUERY_KEY = ['/author'];

const predicate = (type: string) =>
  (
    filterTypePredicates as Record<
      string,
      (itemValue: unknown, filterValue: unknown) => boolean
    >
  )[type];

const getBookProgress = (author: Author) => {
  const { bookCount = 0, availableBookCount = 0 } = author.statistics ?? {};

  return bookCount ? (availableBookCount / bookCount) * 100 : 100;
};

export const FILTERS: Filter[] = [
  {
    key: 'all',
    label: () => translate('All'),
    filters: [],
  },
  {
    key: 'monitored',
    label: () => translate('MonitoredOnly'),
    filters: [
      {
        key: 'monitored',
        value: true,
        type: 'equal',
      },
    ],
  },
  {
    key: 'unmonitored',
    label: () => translate('UnmonitoredOnly'),
    filters: [
      {
        key: 'monitored',
        value: false,
        type: 'equal',
      },
    ],
  },
  {
    key: 'continuing',
    label: () => translate('ContinuingOnly'),
    filters: [
      {
        key: 'status',
        value: 'continuing',
        type: 'equal',
      },
    ],
  },
  {
    key: 'ended',
    label: () => translate('EndedOnly'),
    filters: [
      {
        key: 'status',
        value: 'ended',
        type: 'equal',
      },
    ],
  },
  {
    key: 'missing',
    label: () => translate('MissingBooks'),
    filters: [
      {
        key: 'missing',
        value: true,
        type: 'equal',
      },
    ],
  },
];

type DateFilterValue = string | { time: string; value: number };

export const FILTER_PREDICATES = {
  missing: (author: Author) => {
    const { bookCount = 0, bookFileCount = 0 } = author.statistics ?? {};

    return bookCount - bookFileCount > 0;
  },

  nextBook: (author: Author, filterValue: DateFilterValue, type: string) => {
    return dateFilterPredicate(author.nextBook?.releaseDate, filterValue, type);
  },

  lastBook: (author: Author, filterValue: DateFilterValue, type: string) => {
    return dateFilterPredicate(author.lastBook?.releaseDate, filterValue, type);
  },

  added: (author: Author, filterValue: DateFilterValue, type: string) => {
    return dateFilterPredicate(author.added, filterValue, type);
  },

  ratings: (author: Author, filterValue: number, type: string) => {
    return predicate(type)((author.ratings?.value ?? 0) * 10, filterValue);
  },

  bookCount: (author: Author, filterValue: number, type: string) => {
    return predicate(type)(author.statistics?.bookCount ?? 0, filterValue);
  },

  bookProgress: (author: Author, filterValue: number, type: string) => {
    return predicate(type)(getBookProgress(author), filterValue);
  },

  sizeOnDisk: (author: Author, filterValue: number, type: string) => {
    return predicate(type)(author.statistics?.sizeOnDisk ?? 0, filterValue);
  },
};

export const SORT_PREDICATES = {
  status: (author: Author) => {
    let result = 0;

    if (author.monitored) {
      result += 2;
    }

    if (author.status === 'continuing') {
      result++;
    }

    return result;
  },

  sizeOnDisk: (author: Author) => {
    return author.statistics?.sizeOnDisk ?? 0;
  },

  bookProgress: (author: Author) => {
    const bookCount = author.statistics?.bookCount ?? 0;

    return getBookProgress(author) + bookCount / 1000000;
  },

  // Authors without a next/last book sort first ascending, as the redux index did.
  nextBook: (author: Author) => {
    return author.nextBook?.releaseDate ?? '1/1/1000';
  },

  lastBook: (author: Author) => {
    return author.lastBook?.releaseDate ?? '1/1/1000';
  },

  bookCount: (author: Author) => {
    return author.statistics?.bookCount ?? 0;
  },

  ratings: (author: Author) => {
    return author.ratings?.value ?? 0;
  },
};

export const FILTER_BUILDER: FilterBuilderProp<Author>[] = [
  {
    name: 'monitored',
    label: () => translate('Monitored'),
    type: filterBuilderTypes.EXACT,
    valueType: filterBuilderValueTypes.BOOL,
  },
  {
    name: 'status',
    label: () => translate('Status'),
    type: filterBuilderTypes.EXACT,
    valueType: filterBuilderValueTypes.AUTHOR_STATUS,
  },
  {
    name: 'qualityProfileId',
    label: () => translate('QualityProfile'),
    type: filterBuilderTypes.EXACT,
    valueType: filterBuilderValueTypes.QUALITY_PROFILE,
  },
  {
    name: 'metadataProfileId',
    label: () => translate('MetadataProfile'),
    type: filterBuilderTypes.EXACT,
    valueType: filterBuilderValueTypes.METADATA_PROFILE,
  },
  {
    name: 'nextBook',
    label: () => translate('NextBook'),
    type: filterBuilderTypes.DATE,
    valueType: filterBuilderValueTypes.DATE,
  },
  {
    name: 'lastBook',
    label: () => translate('LastBook'),
    type: filterBuilderTypes.DATE,
    valueType: filterBuilderValueTypes.DATE,
  },
  {
    name: 'added',
    label: () => translate('Added'),
    type: filterBuilderTypes.DATE,
    valueType: filterBuilderValueTypes.DATE,
  },
  {
    name: 'bookCount',
    label: () => translate('BookCount'),
    type: filterBuilderTypes.NUMBER,
  },
  {
    name: 'bookProgress',
    label: () => translate('BookProgress'),
    type: filterBuilderTypes.NUMBER,
  },
  {
    name: 'path',
    label: () => translate('Path'),
    type: filterBuilderTypes.STRING,
  },
  {
    name: 'sizeOnDisk',
    label: () => translate('SizeOnDisk'),
    type: filterBuilderTypes.NUMBER,
    valueType: filterBuilderValueTypes.BYTES,
  },
  {
    name: 'genres',
    label: () => translate('Genres'),
    type: filterBuilderTypes.ARRAY,
    optionsSelector: (items: Author[]) => {
      const genres = new Set<string>();

      items.forEach((author) => {
        author.genres.forEach((genre) => genres.add(genre));
      });

      return Array.from(genres)
        .map((genre) => ({ id: genre, name: genre }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  },
  {
    name: 'ratings',
    label: () => translate('Rating'),
    type: filterBuilderTypes.NUMBER,
  },
  {
    name: 'tags',
    label: () => translate('Tags'),
    type: filterBuilderTypes.ARRAY,
    valueType: filterBuilderValueTypes.TAG,
  },
];

const DEFAULT_AUTHORS: Author[] = [];

const useAuthors = () => {
  const { data, ...result } = useApiQuery<Author[]>({
    path: '/author',
    queryOptions: {
      // SignalR author messages keep the list current.
      staleTime: 5 * 60 * 1000,
      gcTime: Infinity,
    },
  });

  const authorsMap = useMemo(() => {
    return new Map<number, Author>((data ?? []).map((a) => [a.id, a]));
  }, [data]);

  return {
    ...result,
    data: (data as Author[] | undefined) ?? DEFAULT_AUTHORS,
    authorsMap,
  };
};

export default useAuthors;

export const useHasAuthors = () => {
  const { data } = useAuthors();

  return data.length > 0;
};

export const useAuthor = (authorId?: number) => {
  const { authorsMap } = useAuthors();

  return authorId ? authorsMap.get(authorId) : undefined;
};

export const useAuthorByTitleSlug = (titleSlug?: string) => {
  const { data } = useAuthors();

  return useMemo(
    () =>
      titleSlug
        ? data.find((author) => author.titleSlug === titleSlug)
        : undefined,
    [data, titleSlug]
  );
};

const DEFAULT_IDS: number[] = [];

export const useMultipleAuthors = (authorIds: number[] = DEFAULT_IDS) => {
  const { authorsMap } = useAuthors();

  return useMemo(() => {
    return authorIds.reduce<Author[]>((acc, authorId) => {
      const author = authorsMap.get(authorId);

      if (author) {
        acc.push(author);
      }

      return acc;
    }, []);
  }, [authorsMap, authorIds]);
};

// Writes authors into the react-query list. SignalR sends the same change, but the
// list must not wait on it (or miss it while disconnected). Pass belongsTo to add an
// author a list lacks (add new); otherwise only merges.
export const useUpdateAuthorCaches = () => {
  const queryClient = useQueryClient();

  const updateAuthors = useCallback(
    (
      authors: ReadonlyArray<Partial<Author> & { id: number }>,
      belongsTo?: CachedListFilter<Author>
    ) => {
      updateCachedItems<Author>(queryClient, '/author', authors, belongsTo);
    },
    [queryClient]
  );

  const removeAuthors = useCallback(
    (authorIds: number[]) => {
      const ids = new Set(authorIds);

      removeCachedItems<Author>(queryClient, '/author', (a) => ids.has(a.id));
    },
    [queryClient]
  );

  return { updateAuthors, removeAuthors };
};

export interface SaveAuthorOptions {
  moveFiles?: boolean;
}

interface SaveAuthorVariables {
  author: Partial<Author> & { id: number };
  options?: SaveAuthorOptions;
}

// PUT /author/{id}. Pass the whole author (the server maps every field); statistics
// and the redux isSaving flag are left out of the body.
export const useSaveAuthor = (onSaved?: (author: Author) => void) => {
  const { updateAuthors } = useUpdateAuthorCaches();

  const { mutate, isPending, error } = useMutation<
    Author,
    ApiError,
    SaveAuthorVariables
  >({
    mutationFn: ({ author, options }) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { statistics, isSaving, ...body } = author;

      return apiRequest<Author>({
        path: `/author/${author.id}`,
        method: 'PUT',
        body,
        queryParams: options?.moveFiles ? { moveFiles: true } : undefined,
      });
    },
    onSuccess: (savedAuthor) => {
      updateAuthors([savedAuthor]);
      onSaved?.(savedAuthor);
    },
  });

  const saveAuthor = useCallback(
    (author: SaveAuthorVariables['author'], options?: SaveAuthorOptions) => {
      mutate({ author, options });
    },
    [mutate]
  );

  return {
    saveAuthor,
    isSaving: isPending,
    saveError: error,
  };
};

export interface DeleteAuthorOptions {
  deleteFiles?: boolean;
  addImportListExclusion?: boolean;
}

export const useDeleteAuthor = (onDeleted?: () => void) => {
  const queryClient = useQueryClient();
  const { removeAuthors } = useUpdateAuthorCaches();

  const { mutate, isPending, error } = useMutation<
    unknown,
    ApiError,
    { authorId: number; options: DeleteAuthorOptions }
  >({
    mutationFn: ({ authorId, options }) =>
      apiRequest({
        path: `/author/${authorId}`,
        method: 'DELETE',
        queryParams: {
          deleteFiles: options.deleteFiles,
          addImportListExclusion: options.addImportListExclusion,
        },
      }),
    onSuccess: (_data, { authorId }) => {
      removeAuthors([authorId]);
      removeCachedItems<{ id: number; authorId: number }>(
        queryClient,
        '/book',
        (book) => book.authorId === authorId
      );
      onDeleted?.();
    },
  });

  const deleteAuthor = useCallback(
    (authorId: number, options: DeleteAuthorOptions = {}) => {
      mutate({ authorId, options });
    },
    [mutate]
  );

  return {
    deleteAuthor,
    isDeleting: isPending,
    deleteError: error,
  };
};

// Monitors or unmonitors one author: a PUT of the cached author with the new flag.
export const useToggleAuthorMonitored = () => {
  const queryClient = useQueryClient();
  const { saveAuthor, isSaving, saveError } = useSaveAuthor();

  const toggleAuthorMonitored = useCallback(
    ({ authorId, monitored }: { authorId: number; monitored: boolean }) => {
      const author = queryClient
        .getQueryData<Author[]>(AUTHORS_QUERY_KEY)
        ?.find((a) => a.id === authorId);

      if (author) {
        saveAuthor({ ...author, monitored });
      }
    },
    [queryClient, saveAuthor]
  );

  return {
    toggleAuthorMonitored,
    isTogglingAuthorMonitored: isSaving,
    toggleAuthorMonitoredError: saveError,
  };
};

// v1 AuthorEditorResource: only the fields that are set change.
export interface SaveAuthorEditorPayload {
  authorIds: number[];
  monitored?: boolean;
  monitorNewItems?: NewItemMonitorType;
  qualityProfileId?: number;
  metadataProfileId?: number;
  rootFolderPath?: string;
  tags?: number[];
  applyTags?: 'add' | 'remove' | 'replace';
  moveFiles?: boolean;
}

export const useSaveAuthorEditor = (onSaved?: () => void) => {
  const { updateAuthors } = useUpdateAuthorCaches();

  const { mutate, isPending, error } = useApiMutation<
    Author[],
    SaveAuthorEditorPayload
  >({
    path: '/author/editor',
    method: 'PUT',
    mutationOptions: {
      onSuccess: (authors) => {
        // The editor answers without statistics or next/last book; the merge keeps
        // the cached ones.
        updateAuthors(authors);
        onSaved?.();
      },
    },
  });

  return {
    saveAuthorEditor: mutate,
    isSavingAuthorEditor: isPending,
    saveAuthorEditorError: error,
  };
};

export interface BulkDeleteAuthorsPayload {
  authorIds: number[];
  deleteFiles?: boolean;
  addImportListExclusion?: boolean;
}

export const useBulkDeleteAuthors = (onDeleted?: () => void) => {
  const queryClient = useQueryClient();
  const { removeAuthors } = useUpdateAuthorCaches();

  const { mutate, isPending, error } = useApiMutation<
    unknown,
    BulkDeleteAuthorsPayload
  >({
    path: '/author/editor',
    method: 'DELETE',
    mutationOptions: {
      onSuccess: (_data, { authorIds }) => {
        const ids = new Set(authorIds);

        removeAuthors(authorIds);
        removeCachedItems<{ id: number; authorId: number }>(
          queryClient,
          '/book',
          (book) => ids.has(book.authorId)
        );
        onDeleted?.();
      },
    },
  });

  return {
    bulkDeleteAuthors: mutate,
    isBulkDeleting: isPending,
    bulkDeleteError: error,
  };
};

// POST /bookshelf (v1 BookshelfResource): monitors authors and applies a monitoring
// option to their books. Used by the monitoring options modal and the bookshelf.
export interface UpdateAuthorMonitorPayload {
  authors: {
    id: number;
    monitored?: boolean;
    books?: { id: number; monitored: boolean }[];
  }[];
  monitoringOptions?: {
    monitor: AuthorMonitor;
    booksToMonitor?: string[];
  };
  monitorNewItems?: NewItemMonitorType;
}

export const useUpdateAuthorMonitor = (onSaved?: () => void) => {
  const queryClient = useQueryClient();
  const { updateAuthors } = useUpdateAuthorCaches();

  const { mutate, isPending, error } = useApiMutation<
    unknown,
    UpdateAuthorMonitorPayload
  >({
    path: '/bookshelf',
    method: 'POST',
    mutationOptions: {
      onSuccess: (_data, { authors, monitorNewItems, monitoringOptions }) => {
        // The server also unmonitors the author when the books option is None.
        const unmonitorAuthor = monitoringOptions?.monitor === 'none';

        updateAuthors(
          authors
            .filter(
              (a) =>
                a.monitored != null ||
                monitorNewItems != null ||
                unmonitorAuthor
            )
            .map(({ id, monitored }) => {
              const newMonitored = unmonitorAuthor ? false : monitored;

              return {
                id,
                ...(newMonitored == null ? {} : { monitored: newMonitored }),
                ...(monitorNewItems == null ? {} : { monitorNewItems }),
              };
            })
        );

        // Which books changed is decided on the server, so refetch them.
        queryClient.invalidateQueries({ queryKey: ['/book'] });
        onSaved?.();
      },
    },
  });

  return {
    updateAuthorMonitor: mutate,
    isUpdatingAuthorMonitor: isPending,
    updateAuthorMonitorError: error,
  };
};
