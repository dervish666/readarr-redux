import ModelBase from 'App/ModelBase';
import Author from 'Author/Author';
import Book from 'Book/Book';
import { AudioTags } from 'BookFile/BookFile';
import { QualityModel } from 'Quality/Quality';

// Readarr v1 ManualImportResource, ManualImportUpdateResource and the ManualImport
// command (src/Readarr.Api.V1/ManualImport, src/NzbDrone.Core/MediaFiles/BookImport/Manual).
// v1 leaves out null properties, so anything the server can send as null is optional.

export type ImportMode = 'auto' | 'move' | 'copy' | 'chooseImportMode';

export type RejectionType = 'permanent' | 'temporary';

export interface Rejection {
  reason: string;
  type: RejectionType;
}

// GET /manualimport answers a list of these; POST /manualimport answers the
// re-evaluated items.
interface InteractiveImport extends ModelBase {
  path: string;
  name?: string;
  size: number;
  author?: Author;
  book?: Book;
  foreignEditionId?: string;
  quality?: QualityModel;
  releaseGroup?: string;
  qualityWeight: number;
  downloadId?: string;
  indexerFlags: number;
  rejections: Rejection[];
  audioTags?: AudioTags;
  additionalFile: boolean;
  replaceExistingFiles: boolean;
  disableReleaseSwitching: boolean;
}

export default InteractiveImport;

// One item of the POST /manualimport body (ManualImportUpdateResource; its
// rejections are ignored by the server, so they are not sent).
export interface ManualImportUpdateItem extends ModelBase {
  path: string;
  name?: string;
  authorId?: number;
  bookId?: number;
  foreignEditionId?: string;
  quality?: QualityModel;
  releaseGroup?: string;
  indexerFlags: number;
  downloadId?: string;
  additionalFile: boolean;
  replaceExistingFiles: boolean;
  disableReleaseSwitching: boolean;
}

// ManualImportFile, one entry of the ManualImport command's files.
export interface ManualImportFile {
  path: string;
  authorId: number;
  bookId: number;
  foreignEditionId?: string;
  quality: QualityModel;
  indexerFlags: number;
  downloadId?: string;
  disableReleaseSwitching: boolean;
}
