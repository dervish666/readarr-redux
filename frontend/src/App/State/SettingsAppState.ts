import AppSectionState, {
  AppSectionItemState,
  AppSectionSchemaState,
} from 'App/State/AppSectionState';
import { NamingSettingsModel } from 'Settings/MediaManagement/Naming/useNamingSettings';
import { MetadataProfileModel } from 'Settings/Profiles/Metadata/useMetadataProfiles';
import { QualityProfileModel } from 'Settings/Profiles/Quality/useQualityProfiles';
import { UiSettingsModel } from 'Settings/UI/useUiSettings';
import RootFolder from 'typings/RootFolder';

// Read-only redux feeds for the pages still on redux until Stage 3. Settings pages
// edit these through react-query and refresh the feed after every change.
export interface QualityProfilesAppState
  extends AppSectionState<QualityProfileModel>,
    AppSectionSchemaState<QualityProfileModel['items'][number]> {}

export type MetadataProfilesAppState = AppSectionState<MetadataProfileModel>;

export type NamingSettingsAppState = AppSectionItemState<NamingSettingsModel>;

export type UiSettingsAppState = AppSectionItemState<UiSettingsModel>;

interface SettingsAppState {
  metadataProfiles: MetadataProfilesAppState;
  naming: NamingSettingsAppState;
  qualityProfiles: QualityProfilesAppState;
  rootFolders: AppSectionState<RootFolder>;
  ui: UiSettingsAppState;
}

export default SettingsAppState;
