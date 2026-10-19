import ModelBase from 'App/ModelBase';
import useApiQuery from 'Helpers/Hooks/useApiQuery';

// Readarr v1 TagDetailsResource.
export interface TagDetail extends ModelBase {
  label: string;
  delayProfileIds: number[];
  importListIds: number[];
  notificationIds: number[];
  restrictionIds: number[];
  indexerIds: number[];
  downloadClientIds: number[];
  authorIds: number[];
}

const DEFAULT_TAG_DETAILS: TagDetail[] = [];

const EMPTY_TAG_DETAIL: Omit<TagDetail, 'id' | 'label'> = {
  delayProfileIds: [],
  importListIds: [],
  notificationIds: [],
  restrictionIds: [],
  indexerIds: [],
  downloadClientIds: [],
  authorIds: [],
};

const useTagDetails = () => {
  const result = useApiQuery<TagDetail[]>({
    path: '/tag/detail',
  });

  return {
    ...result,
    data: result.data ?? DEFAULT_TAG_DETAILS,
  };
};

export default useTagDetails;

export const useTagDetail = (id: number) => {
  const { data } = useTagDetails();

  return data.find((tagDetail) => tagDetail.id === id) ?? EMPTY_TAG_DETAIL;
};
