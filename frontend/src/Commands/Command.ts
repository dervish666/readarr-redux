import ModelBase from 'App/ModelBase';

// Readarr's CommandStatus, CommandPriority and CommandResult enums, camelCased by v1.
export type CommandStatus =
  | 'queued'
  | 'started'
  | 'completed'
  | 'failed'
  | 'aborted'
  | 'cancelled'
  | 'orphaned';

export type CommandResult = 'unknown' | 'successful' | 'unsuccessful';
export type CommandPriority = 'low' | 'normal' | 'high';

export interface CommandBody {
  sendUpdatesToClient: boolean;
  updateScheduledTask: boolean;
  completionMessage: string;
  requiresDiskAccess: boolean;
  isExclusive: boolean;
  isLongRunning: boolean;
  name: string;
  lastExecutionTime: string;
  lastStartTime: string;
  trigger: string;
  suppressMessages: boolean;
  authorId?: number;
  authorIds?: number[];
  bookId?: number;
  bookIds?: number[];
  [key: string]: unknown;
}

// What the UI posts to /command: a name plus the command's own fields.
export interface NewCommandBody {
  name: string;
  priority?: CommandPriority;
  authorId?: number;
  authorIds?: number[];
  bookId?: number;
  bookIds?: number[];
  [key: string]: string | number | boolean | number[] | object | undefined;
}

interface Command extends ModelBase {
  name: string;
  commandName: string;
  message: string;
  body: CommandBody;
  priority: CommandPriority;
  status: CommandStatus;
  result: CommandResult;
  queued: string;
  started?: string;
  ended?: string;
  duration?: string;
  exception?: string;
  trigger: string;
  clientUserAgent?: string;
  stateChangeTime?: string;
  sendUpdatesToClient: boolean;
  updateScheduledTask: boolean;
  lastExecutionTime?: string;
}

export default Command;
