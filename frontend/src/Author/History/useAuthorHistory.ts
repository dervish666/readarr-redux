import useApiQuery from 'Helpers/Hooks/useApiQuery';
import History from 'typings/History';

// GET /history/author?authorId=[&bookId=] for the author and book pages' History tabs.
// includeBook so each row has its book title without the redux books feed. No SignalR
// message exists for history; a mark as failed refetches it.

export const AUTHOR_HISTORY_PATH = '/history/author';

const DEFAULT_HISTORY: History[] = [];

const useAuthorHistory = (authorId: number, bookId?: number) => {
  const { data, ...result } = useApiQuery<History[]>({
    path: AUTHOR_HISTORY_PATH,
    queryParams: bookId
      ? { authorId, bookId, includeBook: true }
      : { authorId, includeBook: true },
  });

  return {
    ...result,
    data: (data as History[] | undefined) ?? DEFAULT_HISTORY,
  };
};

export default useAuthorHistory;
