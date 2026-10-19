import ModelBase from 'App/ModelBase';
import Author, { Image, Link, Ratings } from 'Author/Author';
import Edition from './Edition';

// Readarr v1 BookResource (src/Readarr.Api.V1/Books/BookResource.cs).
// v1 leaves out null properties, so anything the server can send as null is optional.

export type BookAddType = 'automatic' | 'manual';

export interface BookStatistics {
  bookFileCount: number;
  bookCount: number;
  totalBookCount: number;
  sizeOnDisk: number;
  percentOfBooks: number;
}

export interface AddBookOptions {
  addType: BookAddType;
  searchForNewBook: boolean;
}

interface Book extends ModelBase {
  title: string;
  authorTitle: string;
  seriesTitle: string;
  disambiguation?: string;
  overview?: string;
  authorId: number;
  foreignBookId: string;
  foreignEditionId: string;
  titleSlug: string;
  monitored: boolean;
  anyEditionOk: boolean;
  ratings: Ratings;
  releaseDate?: string;
  pageCount: number;
  genres: string[];
  author?: Author;
  images: Image[];
  links: Link[];
  statistics?: BookStatistics;
  added?: string;
  addOptions?: AddBookOptions;
  remoteCover?: string;
  lastSearchTime?: string;
  editions?: Edition[];

  // Only sent when true, to set the initial state of a grabbed release.
  grabbed?: boolean;
}

// GET/PUT /book/{id}/metadata: the metadata set by hand (PR #20). Null fields use the
// metadata source's value. Not part of BookResource.
export interface BookSeriesLink {
  seriesId: number;
  newSeriesTitle?: string;
  seriesTitle?: string;
  position?: string;
  isManual: boolean;
}

export interface BookSeriesOption {
  id: number;
  title: string;
}

export interface BookMetadataOverride {
  title?: string | null;
  releaseDate?: string | null;
  overview?: string | null;
  pageCount?: number | null;
  series?: BookSeriesLink[];
  availableSeries?: BookSeriesOption[];
}

export default Book;
