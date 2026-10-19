import ModelBase from 'App/ModelBase';
import {
  useDeleteProvider,
  useManageProviderSettings,
  useProviderSettings,
} from 'Settings/useProviderSettings';

// Readarr.Api.V1/ImportLists/ImportListExclusionResource. v1 returns the whole
// list (no paging, no bulk delete), so this is a plain list resource.
export interface ImportListExclusionModel extends ModelBase {
  foreignId: string;
  authorName: string;
}

const PATH = '/importlistexclusion';

const NEW_IMPORT_LIST_EXCLUSION: ImportListExclusionModel = {
  id: 0,
  foreignId: '',
  authorName: '',
};

export const useImportListExclusions = () => {
  return useProviderSettings<ImportListExclusionModel>({ path: PATH });
};

export const useManageImportListExclusion = (id: number | undefined) => {
  return useManageProviderSettings<ImportListExclusionModel>(
    id,
    NEW_IMPORT_LIST_EXCLUSION,
    PATH
  );
};

export const useDeleteImportListExclusion = (id: number) => {
  const result = useDeleteProvider<ImportListExclusionModel>(id, PATH);

  return {
    ...result,
    deleteImportListExclusion: result.deleteProvider,
  };
};
