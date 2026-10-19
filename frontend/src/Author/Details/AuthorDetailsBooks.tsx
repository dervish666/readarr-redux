import React, { useCallback, useMemo, useRef } from 'react';
import Book from 'Book/Book';
import BookFile from 'BookFile/BookFile';
import Table from 'Components/Table/Table';
import TableBody from 'Components/Table/TableBody';
import { SelectState } from 'Helpers/Hooks/useSelectState';
import SortDirection from 'Helpers/Props/SortDirection';
import { SelectStateInputProps } from 'typings/props';
import { sortItems } from 'Utilities/Filter/clientSideFilterAndSort';
import getToggledRange from 'Utilities/Table/getToggledRange';
import {
  authorDetailsBooksOptions,
  AuthorDetailsTableOptions,
} from './authorDetailsOptionsStore';
import BookRow, { MonitorBookOptions } from './BookRow';
import styles from './AuthorDetailsBooks.module.css';

// The redux books sort predicates the old Books tab used.
export const BOOK_SORT_PREDICATES = {
  rating: (book: Book) => book.ratings.value,

  series: (book: Book) => book.seriesTitle,

  status: (book: Book) => {
    let result = 0;

    const hasBookFile = !!book.statistics?.bookFileCount;
    const isAvailable =
      !!book.releaseDate && Date.parse(book.releaseDate) < Date.now();

    if (isAvailable) {
      result++;
    }

    if (book.monitored) {
      result += 2;
    }

    if (hasBookFile) {
      result += 4;
    }

    return result;
  },
};

// Shift-click on a monitor toggle applies it to every book between this one and the
// last one toggled, as the JS tables did.
export const useMonitorRange = (
  items: Book[],
  onMonitorBooks: (bookIds: number[], monitored: boolean) => void
) => {
  const lastToggled = useRef<number | null>(null);

  return useCallback(
    (bookId: number, monitored: boolean, { shiftKey }: MonitorBookOptions) => {
      const bookIds = new Set([bookId]);

      if (shiftKey && lastToggled.current) {
        const { lower, upper } = getToggledRange(
          items,
          bookId,
          lastToggled.current
        );

        for (let i = lower; i < upper; i++) {
          bookIds.add(items[i].id);
        }
      }

      lastToggled.current = bookId;
      onMonitorBooks(Array.from(bookIds), monitored);
    },
    [items, onMonitorBooks]
  );
};

interface AuthorDetailsBooksProps {
  authorName: string;
  authorMonitored: boolean;
  books: Book[];
  bookFilesByBookId: Map<number, BookFile>;
  togglingBookIds: number[];
  isEditorActive: boolean;
  selectState: SelectState;
  onSelectedChange: (items: Book[], options: SelectStateInputProps) => void;
  onMonitorBooks: (bookIds: number[], monitored: boolean) => void;
}

function AuthorDetailsBooks({
  authorName,
  authorMonitored,
  books,
  bookFilesByBookId,
  togglingBookIds,
  isEditorActive,
  selectState,
  onSelectedChange,
  onMonitorBooks,
}: AuthorDetailsBooksProps) {
  const { columns, sortKey, sortDirection } =
    authorDetailsBooksOptions.useOptions();

  const items = useMemo(() => {
    return sortItems(books, {
      sortKey,
      sortDirection,
      sortPredicates: BOOK_SORT_PREDICATES,
    });
  }, [books, sortKey, sortDirection]);

  const visibleColumns = useMemo(() => {
    return isEditorActive
      ? columns
      : columns.filter((column) => column.name !== 'select');
  }, [columns, isEditorActive]);

  const handleMonitorBookPress = useMonitorRange(items, onMonitorBooks);

  const handleSelectedChange = useCallback(
    (options: SelectStateInputProps) => {
      onSelectedChange(items, options);
    },
    [items, onSelectedChange]
  );

  const handleSortPress = useCallback(
    (newSortKey: string, newSortDirection?: SortDirection) => {
      authorDetailsBooksOptions.setSort({
        sortKey: newSortKey,
        sortDirection: newSortDirection,
      });
    },
    []
  );

  const handleTableOptionChange = useCallback(
    (payload: Partial<AuthorDetailsTableOptions>) => {
      authorDetailsBooksOptions.setOptions(payload);
    },
    []
  );

  return (
    <div className={styles.bookType}>
      <div className={styles.books}>
        <Table
          columns={visibleColumns}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortPress={handleSortPress}
          onTableOptionChange={handleTableOptionChange}
        >
          <TableBody>
            {items.map((book) => {
              return (
                <BookRow
                  key={book.id}
                  book={book}
                  bookFile={bookFilesByBookId.get(book.id)}
                  authorName={authorName}
                  authorMonitored={authorMonitored}
                  columns={visibleColumns}
                  isSaving={togglingBookIds.includes(book.id)}
                  isEditorActive={isEditorActive}
                  isSelected={selectState.selectedState[book.id]}
                  onSelectedChange={handleSelectedChange}
                  onMonitorBookPress={handleMonitorBookPress}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default AuthorDetailsBooks;
