import React, { useCallback, useEffect, useMemo } from 'react';
import Book from 'Book/Book';
import BookFile from 'BookFile/BookFile';
import Icon from 'Components/Icon';
import Link from 'Components/Link/Link';
import MonitorToggleButton from 'Components/MonitorToggleButton';
import Table from 'Components/Table/Table';
import TableBody from 'Components/Table/TableBody';
import { icons } from 'Helpers/Props';
import SortDirection from 'Helpers/Props/SortDirection';
import Series from 'Series/Series';
import { sortItems } from 'Utilities/Filter/clientSideFilterAndSort';
import translate from 'Utilities/String/translate';
import { BOOK_SORT_PREDICATES, useMonitorRange } from './AuthorDetailsBooks';
import {
  authorDetailsSeriesOptions,
  AuthorDetailsTableOptions,
} from './authorDetailsOptionsStore';
import BookRow from './BookRow';
import styles from './AuthorDetailsSeries.module.css';

interface AuthorDetailsSeriesProps {
  authorId: number;
  authorName: string;
  authorMonitored: boolean;
  series: Series;
  booksMap: Map<number, Book>;
  bookFilesByBookId: Map<number, BookFile>;
  togglingBookIds: number[];
  isExpanded?: boolean;
  onExpandPress: (seriesId: number, isExpanded: boolean) => void;
  onMonitorBooks: (bookIds: number[], monitored: boolean) => void;
}

function AuthorDetailsSeries({
  authorId,
  authorName,
  authorMonitored,
  series,
  booksMap,
  bookFilesByBookId,
  togglingBookIds,
  isExpanded,
  onExpandPress,
  onMonitorBooks,
}: AuthorDetailsSeriesProps) {
  const { id, title, links } = series;

  const { columns, sortKey, sortDirection } =
    authorDetailsSeriesOptions.useOptions();

  const positionMap = useMemo(() => {
    return links.reduce<Record<number, string | undefined>>((acc, link) => {
      acc[link.bookId] = link.position;
      return acc;
    }, {});
  }, [links]);

  const items = useMemo(() => {
    const booksInSeries = links.reduce<Book[]>((acc, link) => {
      const book = booksMap.get(link.bookId);

      if (book && !acc.includes(book)) {
        acc.push(book);
      }

      return acc;
    }, []);

    if (sortKey === 'position') {
      // Positions are strings such as "1", "2.5" or "1-3"; compare them as numbers.
      const sorted = [...booksInSeries].sort((a, b) =>
        (positionMap[a.id] ?? '').localeCompare(
          positionMap[b.id] ?? '',
          undefined,
          { numeric: true, sensitivity: 'base' }
        )
      );

      return sortDirection === SortDirection.Descending
        ? sorted.reverse()
        : sorted;
    }

    return sortItems(booksInSeries, {
      sortKey,
      sortDirection,
      sortPredicates: BOOK_SORT_PREDICATES,
    });
  }, [links, booksMap, positionMap, sortKey, sortDirection]);

  const isSeriesMonitored = items.every((book) => book.monitored);
  const isSeriesSaving = items.some((book) =>
    togglingBookIds.includes(book.id)
  );

  const handleMonitorBookPress = useMonitorRange(items, onMonitorBooks);

  const handleMonitorSeriesPress = useCallback(
    (monitored: boolean) => {
      onMonitorBooks(
        items.map((book) => book.id),
        monitored
      );
    },
    [items, onMonitorBooks]
  );

  const handleExpandPress = useCallback(() => {
    onExpandPress(id, !isExpanded);
  }, [id, isExpanded, onExpandPress]);

  const handleSortPress = useCallback(
    (newSortKey: string, newSortDirection?: SortDirection) => {
      authorDetailsSeriesOptions.setSort({
        sortKey: newSortKey,
        sortDirection: newSortDirection,
      });
    },
    []
  );

  const handleTableOptionChange = useCallback(
    (payload: Partial<AuthorDetailsTableOptions>) => {
      authorDetailsSeriesOptions.setOptions(payload);
    },
    []
  );

  // Every series starts expanded, and again when the page moves to another author.
  useEffect(() => {
    onExpandPress(id, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorId]);

  return (
    <div className={styles.bookType}>
      <div className={styles.seriesTitle}>
        <MonitorToggleButton
          size={24}
          monitored={isSeriesMonitored}
          isDisabled={!authorMonitored}
          isSaving={isSeriesSaving}
          onPress={handleMonitorSeriesPress}
        />

        <Link className={styles.expandButton} onPress={handleExpandPress}>
          <div className={styles.header}>
            <div className={styles.left}>
              <span className={styles.bookTypeLabel}>{title}</span>

              <span className={styles.bookCount}>
                {translate('CountBooks', { count: items.length })}
              </span>
            </div>

            <span className={styles.expandButtonIcon}>
              <Icon
                name={isExpanded ? icons.COLLAPSE : icons.EXPAND}
                title={
                  isExpanded
                    ? translate('IsExpandedHideBooks')
                    : translate('IsExpandedShowBooks')
                }
                size={20}
              />
            </span>
          </div>
        </Link>
      </div>

      {isExpanded ? (
        <div className={styles.books}>
          <Table
            columns={columns}
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
                    position={positionMap[book.id]}
                    columns={columns}
                    isSaving={togglingBookIds.includes(book.id)}
                    onMonitorBookPress={handleMonitorBookPress}
                  />
                );
              })}
            </TableBody>
          </Table>

          <Link
            className={styles.collapseButtonContainer}
            onPress={handleExpandPress}
          >
            <Icon
              className={styles.collapseButtonIcon}
              name={icons.COLLAPSE}
              size={20}
              title={translate('HideBooks')}
            />
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export default AuthorDetailsSeries;
