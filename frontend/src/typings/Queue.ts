import ModelBase from 'App/ModelBase';
import Author from 'Author/Author';
import DownloadProtocol from 'DownloadClient/DownloadProtocol';
import { QualityModel } from 'Quality/Quality';
import CustomFormat from 'typings/CustomFormat';

export type QueueTrackedDownloadStatus = 'ok' | 'warning' | 'error';

export type QueueTrackedDownloadState =
  | 'downloading'
  | 'downloadFailed'
  | 'downloadFailedPending'
  | 'importPending'
  | 'importing'
  | 'importFailed'
  | 'imported'
  | 'ignored';

export interface StatusMessage {
  title: string;
  messages: string[];
}

// The parts of a v1 BookResource the queue shows, present with includeBook.
export interface QueueBook extends ModelBase {
  title: string;
  titleSlug: string;
  disambiguation?: string;
  releaseDate?: string;
}

// Readarr v1 QueueResource
interface Queue extends ModelBase {
  authorId?: number;
  bookId?: number;
  author?: Author;
  book?: QueueBook;
  quality: QualityModel;
  customFormats?: CustomFormat[];
  customFormatScore: number;
  size: number;
  title: string;
  sizeleft: number;
  timeleft?: string;
  estimatedCompletionTime?: string;
  status: string;
  trackedDownloadStatus?: QueueTrackedDownloadStatus;
  trackedDownloadState?: QueueTrackedDownloadState;
  statusMessages?: StatusMessage[];
  errorMessage?: string;
  downloadId?: string;
  protocol: DownloadProtocol;
  downloadClient?: string;
  downloadClientHasPostImportCategory: boolean;
  indexer?: string;
  outputPath?: string;
  downloadForced: boolean;
}

// Readarr v1 QueueStatusResource
export interface QueueStatus {
  totalCount: number;
  count: number;
  unknownCount: number;
  errors: boolean;
  warnings: boolean;
  unknownErrors: boolean;
  unknownWarnings: boolean;
}

// Readarr v1 QueueImportDestinationResource
export interface QueueImportDestination {
  sourcePath: string;
  sourceSize: number;
  sourceModified: string;
  sourceQuality?: QualityModel;
  sourceTagTitle?: string;
  sourceTagAuthor?: string;
  sourceTagSeries?: string;
  sourceTagSeriesIndex?: string;
  authorName?: string;
  bookTitle?: string;
  rejections?: string[];
  destinationPath?: string;
  destinationExists: boolean;
  destinationSize: number;
  destinationModified?: string;
  destinationTagTitle?: string;
  destinationTagAuthor?: string;
  destinationTagSeries?: string;
  destinationTagSeriesIndex?: string;
  destinationBookFileId?: number;
  destinationQuality?: QualityModel;
  destinationAuthorName?: string;
  destinationBookTitle?: string;
}

// Readarr v1 QueueImportResource
export interface QueueImportOptions {
  ignoreMatchThreshold: boolean;
  replaceDestination: boolean;
}

export default Queue;
