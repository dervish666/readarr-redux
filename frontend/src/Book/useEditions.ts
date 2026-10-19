import useApiQuery from 'Helpers/Hooks/useApiQuery';
import Edition from './Edition';

// Editions on react-query: GET /edition?bookId=... keyed ['/edition', { bookId }].
// v1 sends no edition SignalR message; book messages and book saves invalidate
// ['/edition'] instead. Editions are saved through the book (useSaveBook).

const DEFAULT_EDITIONS: Edition[] = [];

const useEditions = (bookIds: number | number[] | undefined) => {
  const ids = bookIds == null ? [] : ([] as number[]).concat(bookIds);

  const { data, ...result } = useApiQuery<Edition[]>({
    path: '/edition',
    queryParams: { bookId: ids },
    queryOptions: {
      enabled: ids.length > 0,
    },
  });

  return {
    ...result,
    data: (data as Edition[] | undefined) ?? DEFAULT_EDITIONS,
  };
};

export default useEditions;
