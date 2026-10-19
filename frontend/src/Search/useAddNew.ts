import { useMutation } from '@tanstack/react-query';
import { cloneDeep } from 'lodash';
import { useMemo } from 'react';
import Author, { AuthorMonitor } from 'Author/Author';
import useAuthors, { useUpdateAuthorCaches } from 'Author/useAuthors';
import Book from 'Book/Book';
import useBooks, { bookBelongsTo, useUpdateBookCaches } from 'Book/useBooks';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import apiRequest from 'Utilities/Fetch/apiRequest';
import { ApiError } from 'Utilities/Fetch/fetchJson';
import { AddNewOptions } from './addNewOptionsStore';

// Add new on react-query, after Sonarr's AddSeries/AddNewSeries/useAddSeries.ts.
// GET /search?term= is Readarr's combined lookup: a list of SearchResource, each an
// author or a book (with its author and editions). The POST bodies are the looked-up
// resource with the form's choices laid over it, as Utilities/Author/getNewAuthor and
// Utilities/Book/getNewBook built them for the redux search slice.

export interface SearchResult {
  id: number;
  foreignId: string;
  author?: Author;
  book?: Book;
}

const DEFAULT_RESULTS: SearchResult[] = [];

export const useSearchLookup = (term: string) => {
  const { data, ...result } = useApiQuery<SearchResult[]>({
    path: '/search',
    queryParams: { term },
    queryOptions: {
      enabled: !!term,
      // A failing metadata source answers slowly; retrying only delays the message.
      retry: false,
      refetchOnWindowFocus: false,
    },
  });

  return {
    ...result,
    data: (data as SearchResult[] | undefined) ?? DEFAULT_RESULTS,
  };
};

// "Already in your library" comes from the cached lists, so an author or book added
// here (or anywhere, through SignalR) flips its result without a new search.
export const useExistingAuthor = (foreignAuthorId?: string) => {
  const { data } = useAuthors();

  return useMemo(
    () =>
      foreignAuthorId
        ? data.find((author) => author.foreignAuthorId === foreignAuthorId)
        : undefined,
    [data, foreignAuthorId]
  );
};

export const useExistingBook = (foreignBookId?: string) => {
  const { data } = useBooks();

  return useMemo(
    () =>
      foreignBookId
        ? data.find((book) => book.foreignBookId === foreignBookId)
        : undefined,
    [data, foreignBookId]
  );
};

export interface NewAuthorAddOptions {
  monitor?: AuthorMonitor;
  booksToMonitor?: string[];
  searchForMissingBooks: boolean;
}

export type NewAuthor = Omit<Author, 'addOptions'> & {
  addOptions: NewAuthorAddOptions;
};

export type NewBook = Omit<Book, 'addOptions' | 'author'> & {
  author: Author | NewAuthor;
  addOptions: { searchForNewBook: boolean };
};

// AuthorResource for POST /author (Utilities/Author/getNewAuthor).
export function getNewAuthor(
  author: Author,
  options: AddNewOptions,
  searchForMissingBooks: boolean
): NewAuthor {
  return {
    ...cloneDeep(author),
    addOptions: {
      monitor: options.monitor as AuthorMonitor,
      searchForMissingBooks,
    },
    monitored: true,
    monitorNewItems: options.monitorNewItems,
    qualityProfileId: options.qualityProfileId,
    metadataProfileId: options.metadataProfileId,
    rootFolderPath: options.rootFolderPath,
    tags: options.tags,
  };
}

// BookResource for POST /book (Utilities/Book/getNewBook). A new author rides along
// with the author options; "only this book" monitors just this book's foreign id.
// An author already in the library goes as looked up: the server finds it by its
// foreign id and ignores the rest.
export function getNewBook(
  book: Book,
  isExistingAuthor: boolean,
  options: AddNewOptions,
  searchForNewBook: boolean
): NewBook {
  const lookedUp = cloneDeep(book);
  let author: Author | NewAuthor = lookedUp.author as Author;

  if (!isExistingAuthor) {
    const newAuthor = getNewAuthor(author, options, false);

    if (options.monitor === 'specificBook') {
      delete newAuthor.addOptions.monitor;
      newAuthor.addOptions.booksToMonitor = [book.foreignBookId];
    }

    author = newAuthor;
  }

  return {
    ...lookedUp,
    author,
    addOptions: { searchForNewBook },
    monitored: true,
  };
}

export const useAddAuthor = (onAdded?: (author: Author) => void) => {
  const { updateAuthors } = useUpdateAuthorCaches();

  const { mutate, isPending, error } = useMutation<Author, ApiError, NewAuthor>(
    {
      mutationFn: (author) =>
        apiRequest<Author, NewAuthor>({
          path: '/author',
          method: 'POST',
          body: author,
        }),
      onSuccess: (author) => {
        // The author list is unfiltered, so the new author joins it.
        updateAuthors([author], () => true);
        onAdded?.(author);
      },
    }
  );

  return {
    addAuthor: mutate,
    isAdding: isPending,
    addError: error,
  };
};

export const useAddBook = (onAdded?: (book: Book) => void) => {
  const { updateAuthors } = useUpdateAuthorCaches();
  const { updateBooks } = useUpdateBookCaches();

  const { mutate, isPending, error } = useMutation<Book, ApiError, NewBook>({
    mutationFn: (book) =>
      apiRequest<Book, NewBook>({
        path: '/book',
        method: 'POST',
        body: book,
      }),
    onSuccess: (added) => {
      // The answer embeds its author (new or not); book lists hold none.
      const { author, ...book } = added;

      if (author) {
        updateAuthors([author], () => true);
      }

      updateBooks([book], bookBelongsTo);
      onAdded?.(added);
    },
  });

  return {
    addBook: mutate,
    isAdding: isPending,
    addError: error,
  };
};
