import useApiQuery from 'Helpers/Hooks/useApiQuery';

// Readarr.Api.V1/Indexers/IndexerFlagResource. Fixed for the life of the app.
export interface IndexerFlag {
  id: number;
  name: string;
  nameLower: string;
}

const DEFAULT_INDEXER_FLAGS: IndexerFlag[] = [];

const useIndexerFlags = () => {
  const result = useApiQuery<IndexerFlag[]>({
    path: '/indexerFlag',
    queryOptions: {
      gcTime: Infinity,
      staleTime: Infinity,
    },
  });

  return {
    ...result,
    data: result.data ?? DEFAULT_INDEXER_FLAGS,
  };
};

export default useIndexerFlags;
