import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import useApiMutation from 'Helpers/Hooks/useApiMutation';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import { QualityModel } from 'Quality/Quality';
import apiRequest from 'Utilities/Fetch/apiRequest';
import { ApiError } from 'Utilities/Fetch/fetchJson';
import { QueryParams } from 'Utilities/Fetch/getQueryString';
import {
  paramMatches,
  removeCachedItems,
  updateCachedItems,
} from 'Utilities/Fetch/queryCache';
import BookFile from './BookFile';

// Book files on react-query, modelled on Sonarr's EpisodeFile/useEpisodeFiles.ts.
// Lists are keyed ['/bookfile', params]; v1 needs one of authorId, bookId (a list),
// bookFileIds or unmapped.

export type BookFileFilter =
  | { authorId: number }
  | { bookId: number[] }
  | { bookFileIds: number[] }
  | { unmapped: true };

const DEFAULT_BOOK_FILES: BookFile[] = [];

const isEnabled = (params: BookFileFilter) => {
  if ('authorId' in params) {
    return !!params.authorId;
  }

  if ('bookId' in params) {
    return params.bookId.length > 0;
  }

  if ('bookFileIds' in params) {
    return params.bookFileIds.length > 0;
  }

  return true;
};

const useBookFiles = (params: BookFileFilter) => {
  const { data, ...result } = useApiQuery<BookFile[]>({
    path: '/bookfile',
    queryParams: { ...params },
    queryOptions: {
      enabled: isEnabled(params),
    },
  });

  const bookFiles = (data as BookFile[] | undefined) ?? DEFAULT_BOOK_FILES;

  return {
    ...result,
    data: bookFiles,
    hasBookFiles: bookFiles.length > 0,
  };
};

export default useBookFiles;

// A file added by SignalR belongs in a cached list filtered to its author or book.
// Lists by file id and the unmapped list are left alone (unmapped files come and go
// through the page's own refetch).
export const bookFileBelongsTo = (
  params: QueryParams | undefined,
  bookFile: BookFile
) => {
  if (!params) {
    return false;
  }

  if ('authorId' in params) {
    return paramMatches(params, 'authorId', bookFile.authorId);
  }

  if ('bookId' in params) {
    return paramMatches(params, 'bookId', bookFile.bookId);
  }

  return false;
};

// Writes book files into every cached react-query list under /bookfile.
export const useUpdateBookFileCaches = () => {
  const queryClient = useQueryClient();

  const updateBookFiles = useCallback(
    (bookFiles: ReadonlyArray<Partial<BookFile> & { id: number }>) => {
      updateCachedItems<BookFile>(queryClient, '/bookfile', bookFiles);
    },
    [queryClient]
  );

  const removeBookFiles = useCallback(
    (bookFileIds: number[]) => {
      const ids = new Set(bookFileIds);

      removeCachedItems<BookFile>(queryClient, '/bookfile', (f) =>
        ids.has(f.id)
      );
    },
    [queryClient]
  );

  return { updateBookFiles, removeBookFiles };
};

// The server sends book and author messages with the new counts after a delete.
export const useDeleteBookFile = (onDeleted?: () => void) => {
  const { removeBookFiles } = useUpdateBookFileCaches();

  const { mutate, isPending, error } = useMutation<unknown, ApiError, number>({
    mutationFn: (bookFileId) =>
      apiRequest({ path: `/bookfile/${bookFileId}`, method: 'DELETE' }),
    onSuccess: (_data, bookFileId) => {
      removeBookFiles([bookFileId]);
      onDeleted?.();
    },
  });

  return {
    deleteBookFile: mutate,
    isDeleting: isPending,
    deleteError: error,
  };
};

export const useDeleteBookFiles = (onDeleted?: () => void) => {
  const { removeBookFiles } = useUpdateBookFileCaches();

  const { mutate, isPending, error } = useApiMutation<
    unknown,
    { bookFileIds: number[] }
  >({
    path: '/bookfile/bulk',
    method: 'DELETE',
    mutationOptions: {
      onSuccess: (_data, { bookFileIds }) => {
        removeBookFiles(bookFileIds);
        onDeleted?.();
      },
    },
  });

  return {
    deleteBookFiles: mutate,
    isDeleting: isPending,
    deleteError: error,
  };
};

// PUT /bookfile/editor (v1 BookFileListResource): sets the quality of many files.
export interface UpdateBookFilesPayload {
  bookFileIds: number[];
  quality: QualityModel;
}

export const useUpdateBookFiles = (onSaved?: () => void) => {
  const { updateBookFiles } = useUpdateBookFileCaches();

  const { mutate, isPending, error } = useApiMutation<
    BookFile[],
    UpdateBookFilesPayload
  >({
    path: '/bookfile/editor',
    method: 'PUT',
    mutationOptions: {
      onSuccess: (bookFiles, { bookFileIds, quality }) => {
        updateBookFiles(
          bookFiles?.length
            ? bookFiles
            : bookFileIds.map((id) => ({ id, quality }))
        );
        onSaved?.();
      },
    },
  });

  return {
    updateBookFiles: mutate,
    isUpdating: isPending,
    updateError: error,
  };
};
