import ModelBase from 'App/ModelBase';

// Readarr v1 SeriesResource and SeriesBookLinkResource (src/Readarr.Api.V1/Series).

export interface SeriesBookLink extends ModelBase {
  position?: string;
  seriesPosition: number;
  seriesId: number;
  bookId: number;
}

interface Series extends ModelBase {
  title: string;
  description?: string;
  links: SeriesBookLink[];
}

export default Series;
