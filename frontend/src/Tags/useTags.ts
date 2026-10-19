import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import ModelBase from 'App/ModelBase';
import useApiMutation, {
  addOrUpdateQueryClientItem,
  getValidationFailures,
  ValidationFailures,
} from 'Helpers/Hooks/useApiMutation';
import useApiQuery from 'Helpers/Hooks/useApiQuery';

export interface Tag extends ModelBase {
  label: string;
}

const DEFAULT_TAGS: Tag[] = [];

const useTags = () => {
  const result = useApiQuery<Tag[]>({
    path: '/tag',
    queryOptions: {
      gcTime: Infinity,
    },
  });

  return {
    ...result,
    data: result.data ?? DEFAULT_TAGS,
  };
};

export default useTags;

export const useTagList = () => {
  const { data } = useTags();

  return data;
};

export const useSortedTagList = () => {
  const tagList = useTagList();

  return useMemo(
    () => [...tagList].sort((a, b) => a.label.localeCompare(b.label)),
    [tagList]
  );
};

// After a tag change, refetch tags and tag details.
export const useRefreshTags = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/tag'] });
    queryClient.invalidateQueries({ queryKey: ['/tag/detail'] });
  }, [queryClient]);
};

export const useAddTag = (onTagCreated?: (tag: Tag) => void) => {
  const queryClient = useQueryClient();
  const refreshTags = useRefreshTags();
  const [error, setError] = useState<ValidationFailures | null>(null);

  const { mutate, isPending } = useApiMutation<Tag, Pick<Tag, 'label'>>({
    path: '/tag',
    method: 'POST',
    mutationOptions: {
      onMutate: () => {
        setError(null);
      },
      onSuccess: (data) => {
        // Written straight in so the input can show the new tag before the refetch lands.
        queryClient.setQueryData<Tag[]>(['/tag'], (oldData = []) =>
          addOrUpdateQueryClientItem(oldData, data, 'id')
        );

        refreshTags();
        onTagCreated?.(data);
      },
      onError: (error) => {
        setError(getValidationFailures(error));
      },
    },
  });

  return {
    addTag: mutate,
    isAddingTag: isPending,
    addTagError: error,
  };
};

export const useDeleteTag = (id: number) => {
  const queryClient = useQueryClient();
  const refreshTags = useRefreshTags();

  const { mutate, isPending, error } = useApiMutation<void, void>({
    path: `/tag/${id}`,
    method: 'DELETE',
    mutationOptions: {
      onSuccess: () => {
        queryClient.setQueryData<Tag[]>(['/tag'], (oldData) =>
          oldData?.filter((tag) => tag.id !== id)
        );

        refreshTags();
      },
    },
  });

  return {
    deleteTag: mutate,
    isDeletingTag: isPending,
    deleteTagError: error,
  };
};
