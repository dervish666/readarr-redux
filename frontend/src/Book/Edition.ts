import ModelBase from 'App/ModelBase';
import { Image, Link, Ratings } from 'Author/Author';

// Readarr v1 EditionResource (src/Readarr.Api.V1/Books/EditionResource.cs).
interface Edition extends ModelBase {
  bookId: number;
  foreignEditionId: string;
  titleSlug: string;
  isbn13?: string;
  asin?: string;
  title: string;
  language?: string;
  overview?: string;
  format?: string;
  isEbook: boolean;
  disambiguation?: string;
  publisher?: string;
  pageCount: number;
  releaseDate?: string;
  images: Image[];
  links: Link[];
  ratings: Ratings;
  monitored: boolean;
  manualAdd: boolean;
  remoteCover?: string;

  // Only sent when true, to set the initial state of a grabbed release.
  grabbed?: boolean;
}

export default Edition;
