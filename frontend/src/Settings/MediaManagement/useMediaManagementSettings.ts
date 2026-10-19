import { useManageSettings } from 'Settings/useSettings';

// Readarr.Api.V1/Config/MediaManagementConfigResource.
export interface MediaManagementSettingsModel {
  id: number;
  autoUnmonitorPreviouslyDownloadedBooks: boolean;
  recycleBin: string;
  recycleBinCleanupDays: number;
  downloadPropersAndRepacks: string;
  createEmptyAuthorFolders: boolean;
  deleteEmptyFolders: boolean;
  fileDate: string;
  watchLibraryForChanges: boolean;
  rescanAfterRefresh: string;
  allowFingerprinting: string;
  setPermissionsLinux: boolean;
  chmodFolder: string;
  chownGroup: string;
  skipFreeSpaceCheckWhenImporting: boolean;
  minimumFreeSpaceWhenImporting: number;
  minimumBookMatchPercent: number;
  copyUsingHardlinks: boolean;
  importExtraFiles: boolean;
  extraFileExtensions: string;
}

const PATH = '/config/mediamanagement';

export const useManageMediaManagementSettings = () => {
  return useManageSettings<MediaManagementSettingsModel>(PATH);
};
