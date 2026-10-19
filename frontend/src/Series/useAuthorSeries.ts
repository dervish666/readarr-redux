import useApiQuery from 'Helpers/Hooks/useApiQuery';
import Series from './Series';

// GET /series?authorId= (v1 has no other series list). No SignalR message exists for
// series; the author page refetches it after a refresh or rename, and the book edit
// modal invalidates ['/series'] when it saves the book's series.

const DEFAULT_SERIES: Series[] = [];

const useAuthorSeries = (authorId?: number) => {
  const { data, ...result } = useApiQuery<Series[]>({
    path: '/series',
    queryParams: { authorId: authorId ?? 0 },
    queryOptions: {
      enabled: !!authorId,
    },
  });

  return {
    ...result,
    data: (data as Series[] | undefined) ?? DEFAULT_SERIES,
  };
};

export default useAuthorSeries;
