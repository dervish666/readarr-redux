export interface Revision {
  version: number;
  real: number;
  isRepack: boolean;
}

export interface Quality {
  id: number;
  name: string;
}

export interface QualityModel {
  quality: Quality;
  revision: Revision;
}
