import { useManageSettings } from 'Settings/useSettings';

// Readarr.Api.V1/Config/DownloadClientConfigResource.
export interface DownloadClientSettingsModel {
  id: number;
  downloadClientWorkingFolders: string;
  enableCompletedDownloadHandling: boolean;
  autoRedownloadFailed: boolean;
  autoRedownloadFailedFromInteractiveSearch: boolean;
}

const PATH = '/config/downloadclient';

export const useManageDownloadClientSettings = () => {
  return useManageSettings<DownloadClientSettingsModel>(PATH);
};
