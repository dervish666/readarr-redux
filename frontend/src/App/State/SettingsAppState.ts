import AppSectionState, {
  AppSectionDeleteState,
  AppSectionItemState,
  AppSectionSaveState,
  AppSectionSchemaState,
} from 'App/State/AppSectionState';
import { MetadataProfileModel } from 'Settings/Profiles/Metadata/useMetadataProfiles';
import { QualityProfileModel } from 'Settings/Profiles/Quality/useQualityProfiles';
import DownloadClient from 'typings/DownloadClient';
import ImportList from 'typings/ImportList';
import Indexer from 'typings/Indexer';
import IndexerFlag from 'typings/IndexerFlag';
import Notification from 'typings/Notification';
import RootFolder from 'typings/RootFolder';
import General from 'typings/Settings/General';
import UiSettings from 'typings/Settings/UiSettings';

export interface DownloadClientAppState
  extends AppSectionState<DownloadClient>,
    AppSectionDeleteState,
    AppSectionSaveState {
  isTestingAll: boolean;
}

export type GeneralAppState = AppSectionItemState<General>;

export interface ImportListAppState
  extends AppSectionState<ImportList>,
    AppSectionDeleteState,
    AppSectionSaveState {}

export interface IndexerAppState
  extends AppSectionState<Indexer>,
    AppSectionDeleteState,
    AppSectionSaveState {
  isTestingAll: boolean;
}

export interface NotificationAppState
  extends AppSectionState<Notification>,
    AppSectionDeleteState {}

// Read-only redux feeds. Settings > Profiles edits these through react-query and
// dispatches the fetch after every change; other pages still read them here.
export interface QualityProfilesAppState
  extends AppSectionState<QualityProfileModel>,
    AppSectionSchemaState<QualityProfileModel['items'][number]> {}

export type MetadataProfilesAppState = AppSectionState<MetadataProfileModel>;

export type IndexerFlagSettingsAppState = AppSectionState<IndexerFlag>;
export type UiSettingsAppState = AppSectionState<UiSettings>;

interface SettingsAppState {
  downloadClients: DownloadClientAppState;
  general: GeneralAppState;
  importLists: ImportListAppState;
  indexerFlags: IndexerFlagSettingsAppState;
  indexers: IndexerAppState;
  metadataProfiles: MetadataProfilesAppState;
  notifications: NotificationAppState;
  qualityProfiles: QualityProfilesAppState;
  rootFolders: AppSectionState<RootFolder>;
  ui: UiSettingsAppState;
}

export default SettingsAppState;
