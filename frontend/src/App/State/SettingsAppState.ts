import AppSectionState, {
  AppSectionItemState,
  AppSectionSchemaState,
} from 'App/State/AppSectionState';
import { MetadataProfileModel } from 'Settings/Profiles/Metadata/useMetadataProfiles';
import { QualityProfileModel } from 'Settings/Profiles/Quality/useQualityProfiles';
import RootFolder from 'typings/RootFolder';
import General from 'typings/Settings/General';
import UiSettings from 'typings/Settings/UiSettings';

export type GeneralAppState = AppSectionItemState<General>;

// Read-only redux feeds. Settings > Profiles edits these through react-query and
// dispatches the fetch after every change; other pages still read them here.
export interface QualityProfilesAppState
  extends AppSectionState<QualityProfileModel>,
    AppSectionSchemaState<QualityProfileModel['items'][number]> {}

export type MetadataProfilesAppState = AppSectionState<MetadataProfileModel>;

export type UiSettingsAppState = AppSectionState<UiSettings>;

interface SettingsAppState {
  advancedSettings: boolean;
  general: GeneralAppState;
  metadataProfiles: MetadataProfilesAppState;
  qualityProfiles: QualityProfilesAppState;
  rootFolders: AppSectionState<RootFolder>;
  ui: UiSettingsAppState;
}

export default SettingsAppState;
