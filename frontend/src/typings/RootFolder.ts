import ModelBase from 'App/ModelBase';

export type MonitorOption =
  | 'all'
  | 'future'
  | 'missing'
  | 'existing'
  | 'latest'
  | 'first'
  | 'none'
  | 'unknown';

export type NewItemMonitorOption = 'all' | 'none' | 'new';

// Readarr v1 RootFolderResource, Calibre settings included.
interface RootFolder extends ModelBase {
  name: string;
  path: string;
  defaultMetadataProfileId: number;
  defaultQualityProfileId: number;
  defaultMonitorOption: MonitorOption;
  defaultNewItemMonitorOption: NewItemMonitorOption;
  defaultTags: number[];
  isCalibreLibrary: boolean;
  host: string;
  port: number;
  urlBase: string;
  username: string;
  password: string;
  library: string;
  outputFormat: string;
  outputProfile: string;
  useSsl: boolean;
  accessible: boolean;
  freeSpace?: number;
  totalSpace?: number;
}

export default RootFolder;
