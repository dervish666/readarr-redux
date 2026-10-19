import { useQueryClient } from '@tanstack/react-query';
import useApiMutation from 'Helpers/Hooks/useApiMutation';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import { AuthorMetadataOverride } from './Author';

// GET/PUT /author/{id}/metadata (PR #20): the overview set by hand, kept over the
// metadata source's on refresh. Not part of AuthorResource, so it has its own query.
// gcTime 0: the edit modal loads it fresh every time it opens, as the JS modal did.

const metadataPath = (authorId: number) => `/author/${authorId}/metadata`;

export const useAuthorMetadataOverride = (authorId: number) => {
  return useApiQuery<AuthorMetadataOverride>({
    path: metadataPath(authorId),
    queryOptions: {
      gcTime: 0,
      staleTime: 0,
    },
  });
};

export const useSaveAuthorMetadataOverride = (authorId: number) => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useApiMutation<
    AuthorMetadataOverride,
    AuthorMetadataOverride
  >({
    path: metadataPath(authorId),
    method: 'PUT',
    mutationOptions: {
      onSuccess: (data) => {
        queryClient.setQueryData([metadataPath(authorId)], data);
      },
    },
  });

  return {
    saveAuthorMetadataOverride: mutate,
    isSavingAuthorMetadataOverride: isPending,
    saveAuthorMetadataOverrideError: error,
  };
};
