import { AppSectionItemState } from 'App/State/AppSectionState';
import { UiSettingsModel } from 'Settings/UI/useUiSettings';

// The one settings feed left in redux: UI settings for RelativeDateCellConnector.
// Settings > UI saves through react-query and copies the result into it.
export type UiSettingsAppState = AppSectionItemState<UiSettingsModel>;

interface SettingsAppState {
  ui: UiSettingsAppState;
}

export default SettingsAppState;
