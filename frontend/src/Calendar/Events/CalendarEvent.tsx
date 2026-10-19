import classNames from 'classnames';
import moment from 'moment';
import React from 'react';
import { useQueueItemForBook } from 'Activity/Queue/Details/QueueDetailsProvider';
import { useAuthor } from 'Author/useAuthors';
import Book from 'Book/Book';
import getStatusStyle from 'Calendar/getStatusStyle';
import Icon from 'Components/Icon';
import Link from 'Components/Link/Link';
import { icons } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import CalendarEventQueueDetails from './CalendarEventQueueDetails';
import styles from './CalendarEvent.css';

interface CalendarEventProps {
  book: Book;
}

function CalendarEvent({ book }: CalendarEventProps) {
  const {
    id,
    authorId,
    title,
    titleSlug,
    releaseDate,
    monitored,
    statistics,
    grabbed,
  } = book;

  const author = useAuthor(authorId);
  const queueItem = useQueueItemForBook(id);

  if (!author) {
    return null;
  }

  const downloading = !!(queueItem || grabbed);
  const isMonitored = author.monitored && monitored;
  const statusStyle = getStatusStyle(
    downloading,
    moment(releaseDate),
    isMonitored,
    statistics?.percentOfBooks
  );

  return (
    <div className={classNames(styles.event, styles[statusStyle])}>
      <div className={styles.info}>
        <div className={styles.authorName}>
          <Link to={`/author/${author.titleSlug}`}>{author.authorName}</Link>
        </div>

        <div className={styles.statusContainer}>
          {queueItem ? (
            <span className={styles.statusIcon}>
              <CalendarEventQueueDetails {...queueItem} />
            </span>
          ) : null}

          {!queueItem && grabbed ? (
            <Icon
              className={styles.statusIcon}
              name={icons.DOWNLOADING}
              title={translate('BookIsDownloading')}
            />
          ) : null}
        </div>
      </div>

      <div className={styles.bookInfo}>
        <div className={styles.bookTitle}>
          <Link to={`/book/${titleSlug}`}>{title}</Link>
        </div>
      </div>
    </div>
  );
}

export default CalendarEvent;
