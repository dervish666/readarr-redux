import { CustomFilter } from 'Filters/Filter';
import AppSectionListState from './AppSectionState';
import AuthorsAppState from './AuthorsAppState';
import CommandAppState from './CommandAppState';
import SettingsAppState from './SettingsAppState';
import SystemAppState from './SystemAppState';
import TagsAppState from './TagsAppState';

export interface AppSectionState {
  isConnected: boolean;
  isReconnecting: boolean;
  isRestarting: boolean;
  version: string;
  prevVersion?: string;
  dimensions: {
    isSmallScreen: boolean;
    width: number;
    height: number;
  };
}

interface AppState {
  app: AppSectionState;
  authors: AuthorsAppState;
  commands: CommandAppState;
  customFilters: AppSectionListState<CustomFilter>;
  settings: SettingsAppState;
  system: SystemAppState;
  tags: TagsAppState;
}

export default AppState;
