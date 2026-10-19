import ModelBase from 'App/ModelBase';
import useApiQuery from 'Helpers/Hooks/useApiQuery';

// Readarr.Api.V1/Books/RenameBookResource.
export interface OrganizePreviewModel extends ModelBase {
  authorId: number;
  bookId: number;
  bookFileId: number;
  existingPath: string;
  newPath: string;
}

const DEFAULT_ORGANIZE_PREVIEW: OrganizePreviewModel[] = [];

// GET /rename?authorId=&bookId= (bookId only for one book). Not cached: every
// open of the preview asks again, as the redux slice was cleared on close.
const useOrganizePreview = (authorId: number, bookId?: number) => {
  const queryParams: { authorId: number; bookId?: number } = { authorId };

  if (bookId != null) {
    queryParams.bookId = bookId;
  }

  const { data, ...result } = useApiQuery<OrganizePreviewModel[]>({
    path: '/rename',
    queryParams,
    queryOptions: {
      gcTime: 0,
    },
  });

  return {
    ...result,
    items:
      (data as OrganizePreviewModel[] | undefined) ?? DEFAULT_ORGANIZE_PREVIEW,
  };
};

export default useOrganizePreview;
