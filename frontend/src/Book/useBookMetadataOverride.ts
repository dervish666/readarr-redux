import { useQueryClient } from '@tanstack/react-query';
import useApiMutation from 'Helpers/Hooks/useApiMutation';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import { BookMetadataOverride, BookSeriesLink } from './Book';

// GET/PUT /book/{id}/metadata (PR #20): the title, release date, pages, overview and
// series set by hand, kept over the metadata source's on refresh. Not part of
// BookResource, so it has its own query. gcTime 0: the edit modal loads it fresh every
// time it opens, as the JS modal did.

const metadataPath = (bookId: number) => `/book/${bookId}/metadata`;

// What the PUT takes: series rows without the read-only title and isManual.
export interface BookMetadataOverrideRequest {
  title: string | null;
  releaseDate: string | null;
  overview: string | null;
  pageCount: number | null;
  series: Pick<BookSeriesLink, 'seriesId' | 'newSeriesTitle' | 'position'>[];
}

export const useBookMetadataOverride = (bookId: number) => {
  return useApiQuery<BookMetadataOverride>({
    path: metadataPath(bookId),
    queryOptions: {
      gcTime: 0,
      staleTime: 0,
    },
  });
};

export const useSaveBookMetadataOverride = (bookId: number) => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useApiMutation<
    BookMetadataOverride,
    BookMetadataOverrideRequest
  >({
    path: metadataPath(bookId),
    method: 'PUT',
    mutationOptions: {
      onSuccess: (data) => {
        queryClient.setQueryData([metadataPath(bookId)], data);
        // The author page lists the book's series. The book itself arrives in a
        // SignalR book message (BookUpdatedEvent).
        queryClient.invalidateQueries({ queryKey: ['/series'] });
      },
    },
  });

  return {
    saveBookMetadataOverride: mutate,
    isSavingBookMetadataOverride: isPending,
    saveBookMetadataOverrideError: error,
  };
};
