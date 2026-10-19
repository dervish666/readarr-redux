import React, { useCallback } from 'react';
import Author from 'Author/Author';
import AuthorNameLink from 'Author/AuthorNameLink';
import { getAuthorStatusDetails } from 'Author/AuthorStatus';
import { useToggleAuthorMonitored } from 'Author/useAuthors';
import Book from 'Book/Book';
import { useToggleBooksMonitored } from 'Book/useBooks';
import Icon from 'Components/Icon';
import MonitorToggleButton from 'Components/MonitorToggleButton';
import VirtualTableRowCell from 'Components/Table/Cells/VirtualTableRowCell';
import VirtualTableSelectCell from 'Components/Table/Cells/VirtualTableSelectCell';
import { SelectStateInputProps } from 'typings/props';
import BookshelfBook from './BookshelfBook';
import styles from './BookshelfRow.module.css';

interface BookshelfRowProps {
  author: Author;
  books: Book[];
  isSelected: boolean;
  onSelectedChange: (change: SelectStateInputProps) => void;
}

// One author and its books, each with a monitor toggle. The author toggle PUTs the
// author (useToggleAuthorMonitored), a book toggle PUTs /book/monitor.
function BookshelfRow({
  author,
  books,
  isSelected,
  onSelectedChange,
}: BookshelfRowProps) {
  const { id: authorId, status, titleSlug, authorName, monitored } = author;

  const { toggleAuthorMonitored, isTogglingAuthorMonitored } =
    useToggleAuthorMonitored();

  const { toggleBooksMonitored, togglingBookIds } = useToggleBooksMonitored();

  const statusDetails = getAuthorStatusDetails(status);

  const handleAuthorMonitoredPress = useCallback(() => {
    toggleAuthorMonitored({ authorId, monitored: !monitored });
  }, [authorId, monitored, toggleAuthorMonitored]);

  const handleBookMonitoredPress = useCallback(
    (bookId: number, bookMonitored: boolean) => {
      toggleBooksMonitored({ bookIds: [bookId], monitored: bookMonitored });
    },
    [toggleBooksMonitored]
  );

  return (
    <>
      <VirtualTableSelectCell
        className={styles.selectCell}
        id={authorId}
        isSelected={isSelected}
        isDisabled={false}
        onSelectedChange={onSelectedChange}
      />

      <VirtualTableRowCell className={styles.monitored}>
        <MonitorToggleButton
          monitored={monitored}
          size={14}
          isSaving={isTogglingAuthorMonitored}
          onPress={handleAuthorMonitoredPress}
        />
      </VirtualTableRowCell>

      <VirtualTableRowCell className={styles.status}>
        <Icon
          className={styles.statusIcon}
          name={statusDetails.icon}
          title={statusDetails.title}
        />
      </VirtualTableRowCell>

      <VirtualTableRowCell className={styles.title}>
        <AuthorNameLink
          className={styles.titleLink}
          titleSlug={titleSlug}
          authorName={authorName}
        />
      </VirtualTableRowCell>

      <VirtualTableRowCell className={styles.books}>
        {books.map((book) => {
          return (
            <BookshelfBook
              key={book.id}
              book={book}
              isSaving={togglingBookIds.includes(book.id)}
              onBookMonitoredPress={handleBookMonitoredPress}
            />
          );
        })}
      </VirtualTableRowCell>
    </>
  );
}

export default BookshelfRow;
