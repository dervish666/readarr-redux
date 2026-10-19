import ModelBase from 'App/ModelBase';
import { QualityModel } from 'Quality/Quality';

// Readarr v1 BookFileResource (src/Readarr.Api.V1/BookFiles/BookFileResource.cs).

export interface MediaInfo extends ModelBase {
  audioChannels: number;
  audioBitRate?: string;
  audioCodec?: string;
  audioBits?: string;
  audioSampleRate?: string;
}

// The tags read from the file (ParsedTrackInfo). Only GET /bookfile/{id} fills it.
export interface AudioTags {
  title?: string;
  cleanTitle?: string;
  authors?: string[];
  authorTitle?: string;
  bookTitle?: string;
  seriesTitle?: string;
  seriesIndex?: string;
  isbn?: string;
  asin?: string;
  goodreadsId?: string;
  authorMBId?: string;
  bookMBId?: string;
  releaseMBId?: string;
  recordingMBId?: string;
  trackMBId?: string;
  discNumber?: number;
  discCount?: number;
  year?: number;
  publisher?: string;
  label?: string;
  source?: string;
  catalogNumber?: string;
  disambiguation?: string;
  duration?: string;
  quality?: QualityModel;
  trackNumbers?: number[];
  language?: string;
  releaseGroup?: string;
  releaseHash?: string;
}

interface BookFile extends ModelBase {
  authorId: number;
  bookId: number;
  path: string;
  size: number;
  dateAdded: string;
  quality: QualityModel;
  qualityWeight: number;
  indexerFlags?: number;
  mediaInfo?: MediaInfo;
  qualityCutoffNotMet: boolean;
  audioTags?: AudioTags;
}

export default BookFile;
