import ModelBase from 'App/ModelBase';

// Readarr v1 AuthorResource (src/Readarr.Api.V1/Author/AuthorResource.cs).
// v1 leaves out null properties, so anything the server can send as null is optional.

export type AuthorStatus = 'continuing' | 'ended';

export type NewItemMonitorType = 'all' | 'none' | 'new';

export type AuthorMonitor =
  | 'all'
  | 'future'
  | 'missing'
  | 'existing'
  | 'latest'
  | 'first'
  | 'none'
  | 'unknown';

export type CoverType =
  | 'unknown'
  | 'poster'
  | 'banner'
  | 'fanart'
  | 'screenshot'
  | 'headshot'
  | 'cover'
  | 'disc'
  | 'logo'
  | 'clearlogo';

export interface Image {
  coverType: CoverType;
  url: string;
  remoteUrl?: string;
  extension?: string;
}

export interface Link {
  url: string;
  name: string;
}

export interface Ratings {
  votes: number;
  value: number;
  popularity: number;
}

export interface AuthorStatistics {
  bookFileCount: number;
  bookCount: number;
  availableBookCount: number;
  totalBookCount: number;
  sizeOnDisk: number;
  percentOfBooks: number;
}

export interface AddAuthorOptions {
  monitor: AuthorMonitor;
  booksToMonitor?: string[];
  monitored: boolean;
  searchForMissingBooks: boolean;
}

// nextBook and lastBook are the core Book model, not a BookResource.
export interface AuthorBook extends ModelBase {
  title: string;
  titleSlug: string;
  foreignBookId: string;
  releaseDate?: string;
  monitored: boolean;
  disambiguation?: string;
}

interface Author extends ModelBase {
  authorMetadataId: number;
  status: AuthorStatus;
  ended: boolean;
  authorName: string;
  authorNameLastFirst: string;
  foreignAuthorId: string;
  titleSlug: string;
  overview?: string;
  disambiguation?: string;
  links: Link[];
  nextBook?: AuthorBook;
  lastBook?: AuthorBook;
  images: Image[];
  remotePoster?: string;
  path: string;
  qualityProfileId: number;
  metadataProfileId: number;
  monitored: boolean;
  monitorNewItems: NewItemMonitorType;
  rootFolderPath?: string;
  folder?: string;
  genres: string[];
  cleanName: string;
  sortName: string;
  sortNameLastFirst: string;
  tags: number[];
  added: string;
  addOptions?: AddAuthorOptions;
  ratings: Ratings;
  statistics?: AuthorStatistics;

  // Redux only: set by the old author slice while a save is in flight.
  isSaving?: boolean;
}

// GET/PUT /author/{id}/metadata: the overview set by hand (PR #20), or null for the
// metadata source's. Not part of AuthorResource.
export interface AuthorMetadataOverride {
  overview: string | null;
}

export default Author;
