import classNames from 'classnames';
import moment from 'moment';
import React from 'react';
import { useQueueItemForBook } from 'Activity/Queue/Details/QueueDetailsProvider';
import { useAuthor } from 'Author/useAuthors';
import Book from 'Book/Book';
import CalendarEventQueueDetails from 'Calendar/Events/CalendarEventQueueDetails';
import getStatusStyle from 'Calendar/getStatusStyle';
import Icon from 'Components/Icon';
import Link from 'Components/Link/Link';
import { icons } from 'Helpers/Props';
import { useUiSettingsValues } from 'Settings/UI/useUiSettings';
import formatTime from 'Utilities/Date/formatTime';
import translate from 'Utilities/String/translate';
import styles from './AgendaEvent.css';

interface AgendaEventProps {
  book: Book;
}

function AgendaEvent({ book }: AgendaEventProps) {
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
  const { timeFormat } = useUiSettingsValues();

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
    <div className={styles.event}>
      <div className={classNames(styles.eventWrapper, styles[statusStyle])}>
        <div className={styles.time}>{formatTime(releaseDate, timeFormat)}</div>

        <div className={styles.authorName}>
          <Link to={`/author/${author.titleSlug}`}>{author.authorName}</Link>
        </div>

        <div className={styles.bookSeparator}> - </div>

        <div className={styles.bookTitle}>
          <Link to={`/book/${titleSlug}`}>{title}</Link>
        </div>

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
  );
}

export default AgendaEvent;
