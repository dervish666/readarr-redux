import ModelBase from 'App/ModelBase';
import useApiQuery from 'Helpers/Hooks/useApiQuery';

// Readarr.Api.V1/Books/TagDifference.
export interface TagDifference {
  field: string;
  oldValue?: string;
  newValue?: string;
}

// Readarr.Api.V1/Books/RetagBookResource. Only files whose tags would change.
export interface RetagPreviewModel extends ModelBase {
  authorId: number;
  bookId: number;
  trackNumbers: number[];
  bookFileId: number;
  path: string;
  changes: TagDifference[];
}

const DEFAULT_RETAG_PREVIEW: RetagPreviewModel[] = [];

// GET /retag?authorId=&bookId= (the server uses bookId when it is given). Not
// cached: every open of the preview asks again, as the redux slice was cleared.
const useRetagPreview = (authorId: number, bookId?: number) => {
  const queryParams: { authorId: number; bookId?: number } = { authorId };

  if (bookId != null) {
    queryParams.bookId = bookId;
  }

  const { data, ...result } = useApiQuery<RetagPreviewModel[]>({
    path: '/retag',
    queryParams,
    queryOptions: {
      gcTime: 0,
    },
  });

  return {
    ...result,
    items: (data as RetagPreviewModel[] | undefined) ?? DEFAULT_RETAG_PREVIEW,
  };
};

export default useRetagPreview;
