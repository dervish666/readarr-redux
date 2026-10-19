import { useManageSettings } from 'Settings/useSettings';

// Readarr.Api.V1/Config/DevelopmentConfigResource.
export interface DevelopmentSettingsModel {
  id: number;
  consoleLogLevel: string;
  logSql: boolean;
  logRotate: number;
  filterSentryEvents: boolean;
}

const PATH = '/config/development';

export const useManageDevelopmentSettings = () => {
  return useManageSettings<DevelopmentSettingsModel>(PATH);
};
