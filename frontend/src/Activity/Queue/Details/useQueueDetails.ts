import useApiQuery from 'Helpers/Hooks/useApiQuery';
import Queue from 'typings/Queue';

export interface QueueDetailsParams {
  authorId?: number;
  bookIds?: number[];
}

const DEFAULT_QUEUE: Queue[] = [];

// GET /queue/details for an author or a list of books. Keyed ['/queue/details', params]:
// SignalR's queue/details message and every queue mutation invalidate ['/queue/details'].
const useQueueDetails = (params: QueueDetailsParams) => {
  const enabled = !!params.authorId || !!params.bookIds?.length;

  const { data, ...query } = useApiQuery<Queue[]>({
    path: '/queue/details',
    queryParams: { ...params },
    queryOptions: {
      enabled,
    },
  });

  return {
    ...query,
    data: (data as Queue[] | undefined) ?? DEFAULT_QUEUE,
  };
};

export default useQueueDetails;
