import ModelBase from 'App/ModelBase';

// NzbDrone.Core.Backup.BackupType, sent lower case.
export type BackupType = 'scheduled' | 'manual' | 'update';

interface Backup extends ModelBase {
  name: string;
  path: string;
  type: BackupType;
  size: number;
  time: string;
}

export default Backup;
