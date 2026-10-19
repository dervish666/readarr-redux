import ModelBase from 'App/ModelBase';

export type LogEventLevel =
  | 'trace'
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'fatal';

// LogResource.
interface LogEvent extends ModelBase {
  time: string;
  exception?: string;
  exceptionType?: string;
  level: LogEventLevel;
  logger: string;
  message: string;
  method?: string;
}

export default LogEvent;
