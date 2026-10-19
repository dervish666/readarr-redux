import Author from 'Author/Author';
import Book from 'Book/Book';
import { Filter, FilterBuilderProp } from 'Filters/Filter';
import {
  filterBuilderTypes,
  filterBuilderValueTypes,
  filterTypePredicates,
} from 'Helpers/Props';
import dateFilterPredicate from 'Utilities/Date/dateFilterPredicate';
import translate from 'Utilities/String/translate';

// Filters and sorts for the book index, the old redux bookActions/bookIndexActions
// ones. v1 GET /book has no embedded author, so everything that reads the author
// (name, path, quality profile, tags) looks it up in the ['/author'] list.

export type AuthorsMap = Map<number, Author>;

const predicate = (type: string) =>
  (
    filterTypePredicates as Record<
      string,
      (itemValue: unknown, filterValue: unknown) => boolean
    >
  )[type];

type DateFilterValue = string | { time: string; value: number };

export const FILTERS: Filter[] = [
  {
    key: 'all',
    label: () => translate('All'),
    filters: [],
  },
  {
    key: 'monitored',
    label: () => translate('Monitored'),
    filters: [
      {
        key: 'monitored',
        value: true,
        type: 'equal',
      },
    ],
  },
  {
    key: 'unmonitored',
    label: () => translate('Unmonitored'),
    filters: [
      {
        key: 'monitored',
        value: false,
        type: 'equal',
      },
    ],
  },
  {
    key: 'missing',
    label: () => translate('Missing'),
    filters: [
      {
        key: 'monitored',
        value: true,
        type: 'equal',
      },
      {
        key: 'missing',
        value: true,
        type: 'equal',
      },
    ],
  },
  {
    key: 'wanted',
    label: () => translate('Wanted'),
    filters: [
      {
        key: 'monitored',
        value: true,
        type: 'equal',
      },
      {
        key: 'missing',
        value: true,
        type: 'equal',
      },
      {
        // Released before the page loaded, as the redux filter's moment() was.
        key: 'releaseDate',
        value: new Date().toISOString(),
        type: 'lessThan',
      },
    ],
  },
];

export const createFilterPredicates = (authorsMap: AuthorsMap) => {
  const author = (book: Book) => authorsMap.get(book.authorId);

  return {
    missing: (book: Book) => !book.statistics?.bookFileCount,

    releaseDate: (book: Book, filterValue: DateFilterValue, type: string) => {
      return dateFilterPredicate(book.releaseDate, filterValue, type);
    },

    added: (book: Book, filterValue: DateFilterValue, type: string) => {
      return dateFilterPredicate(book.added, filterValue, type);
    },

    author: (book: Book, filterValue: string, type: string) => {
      return predicate(type)(author(book)?.authorName, filterValue);
    },

    qualityProfileId: (book: Book, filterValue: number, type: string) => {
      return predicate(type)(author(book)?.qualityProfileId, filterValue);
    },

    path: (book: Book, filterValue: string, type: string) => {
      return predicate(type)(author(book)?.path, filterValue);
    },

    // Books have no tags in v1; the redux index filtered an always-empty list.
    tags: (book: Book, filterValue: number, type: string) => {
      return predicate(type)(author(book)?.tags ?? [], filterValue);
    },

    ratings: (book: Book, filterValue: number, type: string) => {
      return predicate(type)((book.ratings?.value ?? 0) * 10, filterValue);
    },

    bookFileCount: (book: Book, filterValue: number, type: string) => {
      return predicate(type)(book.statistics?.bookFileCount ?? 0, filterValue);
    },

    sizeOnDisk: (book: Book, filterValue: number, type: string) => {
      return predicate(type)(book.statistics?.sizeOnDisk ?? 0, filterValue);
    },
  };
};

export const createSortPredicates = (authorsMap: AuthorsMap) => {
  const author = (book: Book) => authorsMap.get(book.authorId);

  return {
    status: (book: Book) => {
      let result = 0;

      const isAvailable =
        !!book.releaseDate && Date.parse(book.releaseDate) < Date.now();

      if (isAvailable) {
        result++;
      }

      if (book.monitored) {
        result += 2;
      }

      if (book.statistics?.bookFileCount) {
        result += 4;
      }

      return result;
    },

    authorName: (book: Book) => author(book)?.sortName ?? '',

    // Books have no quality profile; the index shows the author's.
    qualityProfileId: (book: Book) => author(book)?.qualityProfileId ?? 0,

    path: (book: Book) => author(book)?.path ?? '',

    bookFileCount: (book: Book) => book.statistics?.bookFileCount ?? 0,

    sizeOnDisk: (book: Book) => book.statistics?.sizeOnDisk ?? 0,

    ratings: (book: Book) => book.ratings?.value ?? 0,
  };
};

export const FILTER_BUILDER: FilterBuilderProp<Book>[] = [
  {
    name: 'author',
    label: () => translate('Author'),
    type: filterBuilderTypes.STRING,
  },
  {
    name: 'title',
    label: () => translate('Title'),
    type: filterBuilderTypes.STRING,
  },
  {
    name: 'monitored',
    label: () => translate('Monitored'),
    type: filterBuilderTypes.EXACT,
    valueType: filterBuilderValueTypes.BOOL,
  },
  {
    name: 'anyEditionOk',
    label: () => translate('AutomaticallySwitchEdition'),
    type: filterBuilderTypes.EXACT,
    valueType: filterBuilderValueTypes.BOOL,
  },
  {
    name: 'qualityProfileId',
    label: () => translate('QualityProfile'),
    type: filterBuilderTypes.EXACT,
    valueType: filterBuilderValueTypes.QUALITY_PROFILE,
  },
  {
    name: 'releaseDate',
    label: () => translate('ReleaseDate'),
    type: filterBuilderTypes.DATE,
    valueType: filterBuilderValueTypes.DATE,
  },
  {
    name: 'added',
    label: () => translate('Added'),
    type: filterBuilderTypes.DATE,
    valueType: filterBuilderValueTypes.DATE,
  },
  {
    name: 'bookFileCount',
    label: () => translate('FileCount'),
    type: filterBuilderTypes.NUMBER,
  },
  {
    name: 'path',
    label: () => translate('Path'),
    type: filterBuilderTypes.STRING,
  },
  {
    name: 'sizeOnDisk',
    label: () => translate('SizeOnDisk'),
    type: filterBuilderTypes.NUMBER,
    valueType: filterBuilderValueTypes.BYTES,
  },
  {
    name: 'genres',
    label: () => translate('Genres'),
    type: filterBuilderTypes.ARRAY,
    optionsSelector: (items: Book[]) => {
      const genres = new Set<string>();

      items.forEach((book) => {
        (book.genres ?? []).forEach((genre) => genres.add(genre));
      });

      return Array.from(genres)
        .map((genre) => ({ id: genre, name: genre }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  },
  {
    name: 'ratings',
    label: () => translate('Rating'),
    type: filterBuilderTypes.NUMBER,
  },
  {
    name: 'tags',
    label: () => translate('Tags'),
    type: filterBuilderTypes.ARRAY,
    valueType: filterBuilderValueTypes.TAG,
  },
];
