import SettingsAppState from './SettingsAppState';
import SystemAppState from './SystemAppState';

export interface AppSectionState {
  isConnected: boolean;
  isReconnecting: boolean;
  isRestarting: boolean;
  version: string;
  prevVersion?: string;
  isSidebarVisible: boolean;
  dimensions: {
    isSmallScreen: boolean;
    isLargeScreen: boolean;
    width: number;
    height: number;
  };
}

interface AppState {
  app: AppSectionState;
  settings: SettingsAppState;
  system: SystemAppState;
}

export default AppState;
