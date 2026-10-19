import classNames from 'classnames';
import React, { useCallback } from 'react';
import Book from 'Book/Book';
import MonitorToggleButton from 'Components/MonitorToggleButton';
import translate from 'Utilities/String/translate';
import styles from './BookshelfBook.css';

interface BookshelfBookProps {
  book: Book;
  isSaving: boolean;
  onBookMonitoredPress: (bookId: number, monitored: boolean) => void;
}

function BookshelfBook({
  book,
  isSaving,
  onBookMonitoredPress,
}: BookshelfBookProps) {
  const { id, title, disambiguation, monitored, statistics } = book;

  const {
    bookCount = 0,
    bookFileCount = 0,
    totalBookCount = 0,
    percentOfBooks = 0,
  } = statistics ?? {};

  const handleMonitoredPress = useCallback(() => {
    onBookMonitoredPress(id, !monitored);
  }, [id, monitored, onBookMonitoredPress]);

  const shownBookCount = bookFileCount ? bookCount : 0;

  return (
    <div className={styles.book}>
      <div className={styles.info}>
        <MonitorToggleButton
          monitored={monitored}
          isSaving={isSaving}
          onPress={handleMonitoredPress}
        />

        <span className={styles.title}>
          {disambiguation ? `${title} (${disambiguation})` : title}
        </span>
      </div>

      <div
        className={classNames(
          styles.books,
          percentOfBooks < 100 && monitored && styles.missingWanted,
          percentOfBooks === 100 && styles.allBooks
        )}
        title={translate('BookProgressBarText', {
          bookCount: shownBookCount,
          bookFileCount,
          totalBookCount,
        })}
      >
        {totalBookCount === 0 ? '0/0' : `${shownBookCount}/${totalBookCount}`}
      </div>
    </div>
  );
}

export default BookshelfBook;
