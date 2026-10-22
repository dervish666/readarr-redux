import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import useApiMutation from 'Helpers/Hooks/useApiMutation';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import apiRequest from 'Utilities/Fetch/apiRequest';
import { ApiError } from 'Utilities/Fetch/fetchJson';
import { QueryParams } from 'Utilities/Fetch/getQueryString';
import {
  CachedListFilter,
  paramMatches,
  removeCachedItems,
  updateCachedItems,
} from 'Utilities/Fetch/queryCache';
import Book from './Book';

// Books on react-query, modelled on Sonarr's Episode/useEpisodes.ts. Every list is
// keyed ['/book', params], so one cache write reaches the author's books, the book
// index (all books, no params) and lists by id or slug alike.

export type BookFilter =
  | { authorId: number }
  | { bookIds: number[] }
  | { titleSlug: string; includeAllAuthorBooks?: boolean };

const DEFAULT_BOOKS: Book[] = [];

const isEnabled = (params?: BookFilter) => {
  if (!params) {
    return true;
  }

  if ('authorId' in params) {
    return !!params.authorId;
  }

  if ('bookIds' in params) {
    return params.bookIds.length > 0;
  }

  return !!params.titleSlug;
};

// One map per list, shared by every component using it (see useAuthors)
const booksMaps = new WeakMap<Book[], Map<number, Book>>();

const getBooksMap = (books: Book[]) => {
  let map = booksMaps.get(books);

  if (!map) {
    map = new Map<number, Book>(books.map((book) => [book.id, book]));
    booksMaps.set(books, map);
  }

  return map;
};

// No params: every book (GET /book), for the book index and bookshelf.
const useBooks = (params?: BookFilter, enabled = true) => {
  const { data, ...result } = useApiQuery<Book[]>({
    path: '/book',
    queryParams: params ? { ...params } : undefined,
    queryOptions: {
      enabled: enabled && isEnabled(params),
      // SignalR keeps the cached books current, and refetches everything after a reconnect, so don't
      // re-read every book in the library on each window focus or remount.
      staleTime: 5 * 60 * 1000,
      // Keep the whole-library list for good; per-author lists use the default so they don't pile up.
      ...(params ? {} : { gcTime: Infinity }),
    },
  });

  const booksMap = getBooksMap((data as Book[] | undefined) ?? DEFAULT_BOOKS);

  return {
    ...result,
    data: (data as Book[] | undefined) ?? DEFAULT_BOOKS,
    booksMap,
  };
};

export default useBooks;

export const useAuthorBooks = (authorId?: number) => {
  return useBooks(authorId ? { authorId } : undefined, !!authorId);
};

// One book, fresh from GET /book?bookIds={id} (no embedded author), for the edit and
// delete modals. SignalR book messages merge into this list like any other.
export const useBook = (bookId?: number) => {
  const { data, ...result } = useBooks(
    bookId ? { bookIds: [bookId] } : undefined,
    !!bookId
  );

  return {
    ...result,
    book: data.find((book) => book.id === bookId),
  };
};

// A book added by SignalR or a mutation belongs in a cached list when the list is
// unfiltered or filtered to its author. Lists by id or slug are left alone.
export const bookBelongsTo = (params: QueryParams | undefined, book: Book) => {
  if (!params) {
    return true;
  }

  return (
    'authorId' in params && paramMatches(params, 'authorId', book.authorId)
  );
};

// Writes books into every cached react-query book list. Pass belongsTo
// (bookBelongsTo) to add a new book.
export const useUpdateBookCaches = () => {
  const queryClient = useQueryClient();

  const updateBooks = useCallback(
    (
      books: ReadonlyArray<Partial<Book> & { id: number }>,
      belongsTo?: CachedListFilter<Book>
    ) => {
      updateCachedItems<Book>(queryClient, '/book', books, belongsTo);
    },
    [queryClient]
  );

  const removeBooks = useCallback(
    (bookIds: number[]) => {
      const ids = new Set(bookIds);

      removeCachedItems<Book>(queryClient, '/book', (book) => ids.has(book.id));
    },
    [queryClient]
  );

  return { updateBooks, removeBooks };
};

// PUT /book/{id}. The server saves the book and its editions (the monitored edition
// is the one shown), so edition lists for the book are refetched.
export const useSaveBook = (onSaved?: (book: Book) => void) => {
  const queryClient = useQueryClient();
  const { updateBooks } = useUpdateBookCaches();

  const { mutate, isPending, error } = useMutation<
    Book,
    ApiError,
    Partial<Book> & { id: number }
  >({
    mutationFn: (book) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { statistics, ...body } = book;

      return apiRequest<Book>({
        path: `/book/${book.id}`,
        method: 'PUT',
        body,
      });
    },
    onSuccess: (savedBook, book) => {
      // The response is the saved book; fall back to what was sent if it is empty.
      updateBooks([savedBook?.id ? savedBook : book]);
      queryClient.invalidateQueries({ queryKey: ['/edition'] });
      queryClient.invalidateQueries({
        queryKey: [`/book/${book.id}/overview`],
      });
      onSaved?.(savedBook);
    },
  });

  return {
    saveBook: mutate,
    isSaving: isPending,
    saveError: error,
  };
};

export interface ToggleBooksMonitoredPayload {
  bookIds: number[];
  monitored: boolean;
}

// PUT /book/monitor, for one book or many. The cache changes at once and is rolled
// back if the request fails, so a monitor toggle doesn't wait on the server.
export const useToggleBooksMonitored = () => {
  const queryClient = useQueryClient();
  const { updateBooks } = useUpdateBookCaches();

  const { mutate, isPending, error, variables } = useApiMutation<
    Book[],
    ToggleBooksMonitoredPayload
  >({
    path: '/book/monitor',
    method: 'PUT',
    mutationOptions: {
      onMutate: async ({ bookIds, monitored }) => {
        // A refetch landing after this would overwrite the optimistic value.
        await queryClient.cancelQueries({ queryKey: ['/book'] });

        // Remember each book's own value: a series or shift-click toggle sends books
        // that were already in the target state, so "flip back" would be wrong.
        const previous = new Map<number, boolean>();

        queryClient
          .getQueriesData<Book[]>({ queryKey: ['/book'] })
          .forEach(([, books]) => {
            if (!Array.isArray(books)) {
              return;
            }

            books.forEach((book) => {
              if (bookIds.includes(book.id) && !previous.has(book.id)) {
                previous.set(book.id, book.monitored);
              }
            });
          });

        updateCachedItems<Book>(
          queryClient,
          '/book',
          bookIds.map((id) => ({ id, monitored }))
        );

        return previous;
      },
      onError: (_error, _payload, context) => {
        const previous = context as Map<number, boolean> | undefined;

        if (!previous?.size) {
          queryClient.invalidateQueries({ queryKey: ['/book'] });
          return;
        }

        updateCachedItems<Book>(
          queryClient,
          '/book',
          [...previous].map(([id, monitored]) => ({ id, monitored }))
        );
      },
      onSuccess: (books, { bookIds, monitored }) => {
        // The answer has no statistics; the merge keeps the cached ones.
        updateBooks(
          books?.length ? books : bookIds.map((id) => ({ id, monitored }))
        );
      },
    },
  });

  return {
    toggleBooksMonitored: mutate,
    isTogglingBooksMonitored: isPending,
    togglingBookIds: isPending ? variables?.bookIds ?? [] : [],
    toggleBooksMonitoredError: error,
  };
};

export interface DeleteBookOptions {
  deleteFiles?: boolean;
  addImportListExclusion?: boolean;
}

export const useDeleteBook = (onDeleted?: () => void) => {
  const queryClient = useQueryClient();
  const { removeBooks } = useUpdateBookCaches();

  const { mutate, isPending, error } = useMutation<
    unknown,
    ApiError,
    { bookId: number; options: DeleteBookOptions }
  >({
    mutationFn: ({ bookId, options }) =>
      apiRequest({
        path: `/book/${bookId}`,
        method: 'DELETE',
        queryParams: {
          deleteFiles: options.deleteFiles,
          addImportListExclusion: options.addImportListExclusion,
        },
      }),
    onSuccess: (_data, { bookId }) => {
      removeBooks([bookId]);
      // The author's counts change and no author message follows a book delete.
      queryClient.invalidateQueries({ queryKey: ['/author'] });
      onDeleted?.();
    },
  });

  const deleteBook = useCallback(
    (bookId: number, options: DeleteBookOptions = {}) => {
      mutate({ bookId, options });
    },
    [mutate]
  );

  return {
    deleteBook,
    isDeleting: isPending,
    deleteError: error,
  };
};

// v1 BookEditorResource.
export interface SaveBookEditorPayload {
  bookIds: number[];
  monitored?: boolean;
}

export const useSaveBookEditor = (onSaved?: () => void) => {
  const { updateBooks } = useUpdateBookCaches();

  const { mutate, isPending, error } = useApiMutation<
    Book[],
    SaveBookEditorPayload
  >({
    path: '/book/editor',
    method: 'PUT',
    mutationOptions: {
      onSuccess: (books) => {
        updateBooks(books);
        onSaved?.();
      },
    },
  });

  return {
    saveBookEditor: mutate,
    isSavingBookEditor: isPending,
    saveBookEditorError: error,
  };
};

export interface BulkDeleteBooksPayload {
  bookIds: number[];
  deleteFiles?: boolean;
  addImportListExclusion?: boolean;
}

export const useBulkDeleteBooks = (onDeleted?: () => void) => {
  const queryClient = useQueryClient();
  const { removeBooks } = useUpdateBookCaches();

  const { mutate, isPending, error } = useApiMutation<
    unknown,
    BulkDeleteBooksPayload
  >({
    path: '/book/editor',
    method: 'DELETE',
    mutationOptions: {
      onSuccess: (_data, { bookIds }) => {
        removeBooks(bookIds);
        queryClient.invalidateQueries({ queryKey: ['/author'] });
        onDeleted?.();
      },
    },
  });

  return {
    bulkDeleteBooks: mutate,
    isBulkDeleting: isPending,
    bulkDeleteError: error,
  };
};
