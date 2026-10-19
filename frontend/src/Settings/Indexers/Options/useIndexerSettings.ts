import { useManageSettings } from 'Settings/useSettings';

// Readarr.Api.V1/Config/IndexerConfigResource.
export interface IndexerSettingsModel {
  id: number;
  minimumAge: number;
  maximumSize: number;
  retention: number;
  rssSyncInterval: number;
}

const PATH = '/config/indexer';

export const useManageIndexerSettings = () => {
  return useManageSettings<IndexerSettingsModel>(PATH);
};
