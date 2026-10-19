import ModelBase from 'App/ModelBase';

// LogFileResource.
interface LogFile extends ModelBase {
  filename: string;
  lastWriteTime: string;
  contentsUrl: string;
  downloadUrl: string;
}

export default LogFile;
