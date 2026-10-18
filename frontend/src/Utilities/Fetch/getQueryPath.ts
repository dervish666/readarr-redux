import { apiRoot } from 'Utilities/Fetch/fetchJson';

const getQueryPath = (path: string) => {
  return apiRoot + path;
};

export default getQueryPath;
