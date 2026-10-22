import { hashKey, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { create } from 'zustand';
import ModelBase from 'App/ModelBase';
import DownloadProtocol from 'DownloadClient/DownloadProtocol';
import { Filter, FilterBuilderProp } from 'Filters/Filter';
import { useCustomFiltersList } from 'Filters/useCustomFilters';
import useApiMutation from 'Helpers/Hooks/useApiMutation';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import { applySort } from 'Helpers/Hooks/useOptionsStore';
import {
  filterBuilderTypes,
  filterBuilderValueTypes,
  filterTypePredicates,
  filterTypes,
} from 'Helpers/Props';
import SortDirection from 'Helpers/Props/SortDirection';
import { QualityModel } from 'Quality/Quality';
import CustomFormat from 'typings/CustomFormat';
import clientSideFilterAndSort from 'Utilities/Filter/clientSideFilterAndSort';
import translate from 'Utilities/String/translate';
import InteractiveSearchPayload from './InteractiveSearchPayload';
import InteractiveSearchType from './InteractiveSearchType';
import { useReleaseOptions } from './releaseOptionsStore';

// Readarr.Api.V1/Indexers/ReleaseResource, the flat v1 shape (Sonarr v5 nests it).
// v1 omits nulls, so the nullable fields are optional.
export interface Release extends ModelBase {
  guid: string;
  quality: QualityModel;
  qualityWeight: number;
  age: number;
  ageHours: number;
  ageMinutes: number;
  size: number;
  indexerId: number;
  indexer: string;
  releaseGroup?: string;
  subGroup?: string;
  releaseHash?: string;
  title: string;
  discography: boolean;
  sceneSource: boolean;
  airDate?: string;
  authorName?: string;
  bookTitle?: string;
  approved: boolean;
  temporarilyRejected: boolean;
  rejected: boolean;
  rejections: string[];
  publishDate: string;
  commentUrl?: string;
  downloadUrl?: string;
  infoUrl?: string;
  downloadAllowed: boolean;
  releaseWeight: number;
  customFormats: CustomFormat[];
  customFormatScore: number;
  magnetUrl?: string;
  infoHash?: string;
  seeders?: number;
  leechers?: number;
  protocol: DownloadProtocol;
  indexerFlags: number;
  authorId?: number;
  bookId?: number;
  downloadClientId?: number;
  downloadClient?: string;
}

export const RELEASES_CUSTOM_FILTER_TYPE = 'releases';

export const FILTERS: Filter[] = [
  {
    key: 'all',
    label: () => translate('All'),
    filters: [],
  },
  {
    key: 'discography-pack',
    label: () => translate('Discography'),
    filters: [
      {
        key: 'discography',
        value: true,
        type: filterTypes.EQUAL,
      },
    ],
  },
  {
    key: 'not-discography-pack',
    label: () => translate('NotDiscography'),
    filters: [
      {
        key: 'discography',
        value: false,
        type: filterTypes.EQUAL,
      },
    ],
  },
];

export const FILTER_BUILDER: FilterBuilderProp<Release>[] = [
  {
    name: 'title',
    label: () => translate('Title'),
    type: filterBuilderTypes.STRING,
  },
  {
    name: 'age',
    label: () => translate('Age'),
    type: filterBuilderTypes.NUMBER,
  },
  {
    name: 'protocol',
    label: () => translate('Protocol'),
    type: filterBuilderTypes.EXACT,
    valueType: filterBuilderValueTypes.PROTOCOL,
  },
  {
    name: 'indexerId',
    label: () => translate('Indexer'),
    type: filterBuilderTypes.EXACT,
    valueType: filterBuilderValueTypes.INDEXER,
  },
  {
    name: 'size',
    label: () => translate('Size'),
    type: filterBuilderTypes.NUMBER,
    valueType: filterBuilderValueTypes.BYTES,
  },
  {
    name: 'seeders',
    label: () => translate('Seeders'),
    type: filterBuilderTypes.NUMBER,
  },
  {
    // The redux list labelled leechers "Peers"; saved custom filters use this key.
    name: 'leechers',
    label: () => translate('Peers'),
    type: filterBuilderTypes.NUMBER,
  },
  {
    name: 'quality',
    label: () => translate('Quality'),
    type: filterBuilderTypes.EXACT,
    valueType: filterBuilderValueTypes.QUALITY,
  },
  {
    name: 'customFormatScore',
    label: () => translate('CustomFormatScore'),
    type: filterBuilderTypes.NUMBER,
  },
  {
    name: 'rejectionCount',
    label: () => translate('RejectionCount'),
    type: filterBuilderTypes.NUMBER,
  },
];

const typePredicates = filterTypePredicates as Record<
  string,
  (itemValue: unknown, filterValue: unknown) => boolean
>;

function compare(itemValue: unknown, value: unknown, type: string) {
  const predicate = typePredicates[type];

  return predicate ? predicate(itemValue, value) : false;
}

// The redux list's predicates; any other key compares the release's own field.
const FILTER_PREDICATES = {
  quality: (item: Release, value: number, type: string) => {
    return compare(item.quality.quality.id, value, type);
  },

  rejectionCount: (item: Release, value: number, type: string) => {
    return compare((item.rejections ?? []).length, value, type);
  },

  peers: (item: Release, value: number, type: string) => {
    return compare((item.seeders || 0) + (item.leechers || 0), value, type);
  },
};

const SORT_PREDICATES = {
  age: (item: Release) => item.ageMinutes,

  peers: (item: Release) => {
    const seeders = item.seeders || 0;
    const leechers = item.leechers || 0;

    return seeders * 1000000 + leechers;
  },

  rejections: (item: Release) => {
    const rejections = item.rejections ?? [];
    const releaseWeight = item.releaseWeight;

    if (rejections.length !== 0) {
      return releaseWeight + 1000000;
    }

    return releaseWeight;
  },
};

interface ReleaseSort {
  sortKey: string;
  sortDirection: SortDirection;
}

// Not persisted, as in redux: every visit starts in the server's order.
const releaseSortStore = create<ReleaseSort>(() => ({
  sortKey: 'releaseWeight',
  sortDirection: SortDirection.Ascending,
}));

export const setReleaseSort = (
  sortKey: string,
  sortDirection: SortDirection | undefined
) => {
  releaseSortStore.setState((state) =>
    applySort(state, sortKey, sortDirection)
  );
};

const DEFAULT_RELEASES: Release[] = [];
const THIRTY_MINUTES = 30 * 60 * 1000;

const RELEASE_QUERY_OPTIONS = {
  // The server keeps a search's releases for 30 minutes to grab from.
  staleTime: THIRTY_MINUTES,
  gcTime: THIRTY_MINUTES,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  retry: false,
};

export const getSearchType = (
  payload: InteractiveSearchPayload
): InteractiveSearchType => {
  return 'bookId' in payload ? 'book' : 'author';
};

export const useSelectedReleaseFilterKey = (
  payload: InteractiveSearchPayload
) => {
  const { bookSelectedFilterKey, authorSelectedFilterKey } =
    useReleaseOptions();

  return getSearchType(payload) === 'book'
    ? bookSelectedFilterKey
    : authorSelectedFilterKey;
};

// GET /release?bookId= or ?authorId= runs a search on every enabled indexer, so it
// only runs once per page visit: the page keeps the result until it unmounts (see
// useKeepReleases), and nothing refetches it on focus or retries a failure.
const useReleases = (
  payload: InteractiveSearchPayload,
  { enabled = true }: { enabled?: boolean } = {}
) => {
  const customFilters = useCustomFiltersList(RELEASES_CUSTOM_FILTER_TYPE);
  const selectedFilterKey = useSelectedReleaseFilterKey(payload);
  const { sortKey, sortDirection } = releaseSortStore();

  const { data, ...result } = useApiQuery<Release[]>({
    path: '/release',
    queryParams: { ...payload },
    queryOptions: {
      ...RELEASE_QUERY_OPTIONS,
      enabled,
    },
  });

  const { data: items, totalItems } = useMemo(() => {
    return clientSideFilterAndSort<Release>(
      (data as Release[] | undefined) ?? DEFAULT_RELEASES,
      {
        selectedFilterKey,
        filters: FILTERS,
        filterPredicates: FILTER_PREDICATES,
        customFilters,
        sortKey,
        sortDirection,
        sortPredicates: SORT_PREDICATES,
      }
    );
  }, [data, selectedFilterKey, customFilters, sortKey, sortDirection]);

  return {
    ...result,
    data: items,
    allReleases: (data as Release[] | undefined) ?? DEFAULT_RELEASES,
    totalItems,
    selectedFilterKey,
    sortKey,
    sortDirection,
  };
};

export default useReleases;

// Held by the page that shows a search (author, book, the book search modal). Its
// observer keeps a running search alive while the Search tab is switched away from
// (the redux thunk carried on too), and leaving the page cancels the search and drops
// its releases, as cancelFetchReleases and clearReleases did.
export const useKeepReleases = (payload: InteractiveSearchPayload) => {
  const queryClient = useQueryClient();
  const queryParams = useMemo(() => ({ ...payload }), [payload]);
  const queryKeyHash = hashKey(['/release', queryParams]);

  useApiQuery<Release[]>({
    path: '/release',
    queryParams,
    queryOptions: {
      ...RELEASE_QUERY_OPTIONS,
      enabled: false,
    },
  });

  useEffect(() => {
    return () => {
      const queryCache = queryClient.getQueryCache();
      const query = queryCache.get(queryKeyHash);

      if (query) {
        queryCache.remove(query);
      }
    };
  }, [queryKeyHash, queryClient]);
};

// POST /release with a v1 ReleaseResource holding only what the redux thunk sent:
// guid and indexerId, plus bookId or authorId when grabbing a release that needed
// confirmation. Readarr has no override modal, so downloadClientId is never sent.
interface GrabRelease {
  guid: string;
  indexerId: number;
  bookId?: number;
  authorId?: number;
}

export const useGrabRelease = () => {
  const [isGrabbed, setIsGrabbed] = useState(false);

  const { mutate, isPending, error } = useApiMutation<unknown, GrabRelease>({
    path: '/release',
    method: 'POST',
    mutationOptions: {
      onMutate: () => {
        setIsGrabbed(false);
      },
      onSuccess: () => {
        setIsGrabbed(true);
      },
    },
  });

  const grabError = useMemo(() => {
    if (!error) {
      return undefined;
    }

    return error.statusBody?.message ?? translate('InteractiveSearchGrabError');
  }, [error]);

  return {
    grabRelease: mutate,
    isGrabbing: isPending,
    isGrabbed,
    grabError,
  };
};
