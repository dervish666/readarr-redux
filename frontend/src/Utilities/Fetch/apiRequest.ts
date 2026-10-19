import fetchJson from 'Utilities/Fetch/fetchJson';
import getQueryPath from 'Utilities/Fetch/getQueryPath';
import getQueryString, { QueryParams } from 'Utilities/Fetch/getQueryString';

export interface ApiRequestOptions<TData> {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: TData;
  queryParams?: QueryParams;
}

// One /api/v1 request with the API key. For mutations whose path or query string
// changes per call, which useApiMutation fixes when the hook is created.
function apiRequest<T, TData = unknown>({
  path,
  method,
  body,
  queryParams,
}: ApiRequestOptions<TData>) {
  return fetchJson<T, TData>({
    path: getQueryPath(path) + getQueryString(queryParams),
    method,
    body,
    headers: { 'X-Api-Key': window.Readarr.apiKey },
  });
}

export default apiRequest;
