import ModelBase from 'App/ModelBase';
import Author from 'Author/Author';
import { QualityModel } from 'Quality/Quality';
import CustomFormat from 'typings/CustomFormat';

// Readarr's EntityHistoryEventType, serialised camelCase by the v1 API.
export type HistoryEventType =
  | 'unknown'
  | 'grabbed'
  | 'bookFileImported'
  | 'downloadFailed'
  | 'bookFileDeleted'
  | 'bookFileRenamed'
  | 'bookImportIncomplete'
  | 'downloadImported'
  | 'bookFileRetagged'
  | 'downloadIgnored';

// The v1 resource's Data is a Dictionary<string, string>. These are the keys the
// UI reads, by the event that writes them; every value arrives as a string.
export interface HistoryData {
  // grabbed and downloadImported
  indexer?: string;
  releaseGroup?: string;
  customFormatScore?: string;
  nzbInfoUrl?: string;
  downloadClient?: string;
  downloadClientName?: string;
  downloadId?: string;
  age?: string;
  ageHours?: string;
  ageMinutes?: string;
  publishedDate?: string;

  // downloadFailed and downloadIgnored
  message?: string;

  // bookFileImported
  droppedPath?: string;
  importedPath?: string;

  // bookFileDeleted: Manual, MissingFromDisk or Upgrade
  reason?: string;

  // bookFileRenamed
  sourcePath?: string;
  path?: string;

  // bookFileRetagged: diff is a JSON array of { field, oldValue, newValue }
  diff?: string;
  tagsScrubbed?: string;

  // bookImportIncomplete: a JSON array of { title, messages }
  statusMessages?: string;
}

// The parts of a v1 BookResource history shows, present with includeBook.
export interface HistoryBook extends ModelBase {
  title: string;
  titleSlug: string;
  disambiguation?: string;
}

// Readarr v1 HistoryResource
interface History extends ModelBase {
  bookId: number;
  authorId: number;
  sourceTitle: string;
  quality: QualityModel;
  customFormats?: CustomFormat[];
  customFormatScore: number;
  qualityCutoffNotMet: boolean;
  date: string;
  downloadId?: string;
  eventType: HistoryEventType;
  data: HistoryData;
  book?: HistoryBook;
  author?: Author;
}

export default History;
