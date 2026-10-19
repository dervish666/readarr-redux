import classNames from 'classnames';
import React, { ReactNode } from 'react';
import Author from 'Author/Author';
import { QualityProfileModel } from 'Settings/Profiles/Quality/useQualityProfiles';
import { useUiSettingsValues } from 'Settings/UI/useUiSettings';
import formatDateTime from 'Utilities/Date/formatDateTime';
import getRelativeDate from 'Utilities/Date/getRelativeDate';
import formatBytes from 'Utilities/Number/formatBytes';
import translate from 'Utilities/String/translate';
import { AuthorIndexOverviewOptions } from '../authorIndexOptionsStore';
import { getBookCountLabel } from '../Posters/AuthorIndexPosterInfo';
import styles from './AuthorIndexOverviewInfo.css';

interface AuthorIndexOverviewInfoProps {
  author: Author;
  qualityProfile?: QualityProfileModel;
  overviewOptions: AuthorIndexOverviewOptions;
  sortKey: string;
}

// The chip strip under an overview: each detail shows when its option is on or the
// index is sorted by it.
function AuthorIndexOverviewInfo(props: AuthorIndexOverviewInfoProps) {
  const { author, qualityProfile, overviewOptions, sortKey } = props;

  const { shortDateFormat, showRelativeDates, longDateFormat, timeFormat } =
    useUiSettingsValues();

  const {
    showMonitored,
    showQualityProfile,
    showLastBook,
    showAdded,
    showBookCount,
    showPath,
    showSizeOnDisk,
  } = overviewOptions;

  const { monitored, lastBook, added, path, statistics } = author;
  const bookCount = statistics?.bookCount ?? 0;
  const sizeOnDisk = statistics?.sizeOnDisk ?? 0;

  const relativeDate = (date: string) =>
    getRelativeDate(date, shortDateFormat, showRelativeDates, {
      timeFormat,
      timeForToday: true,
    });

  const chips: ReactNode[] = [];

  if (showMonitored || sortKey === 'status') {
    chips.push(
      <span key="monitored" className={styles.chip}>
        {translate(monitored ? 'Monitored' : 'Unmonitored')}
      </span>
    );
  }

  if (
    qualityProfile?.name &&
    (showQualityProfile || sortKey === 'qualityProfileId')
  ) {
    chips.push(
      <span
        key="qualityProfile"
        className={styles.chip}
        title={translate('QualityProfile')}
      >
        {qualityProfile.name}
      </span>
    );
  }

  if (lastBook?.releaseDate && (showLastBook || sortKey === 'lastBook')) {
    chips.push(
      <span
        key="lastBook"
        className={styles.chip}
        title={`${translate('LastBook')}: ${lastBook.title}`}
      >
        <span className={styles.dateLabel}>{translate('LastBook')}</span>
        {relativeDate(lastBook.releaseDate)}
      </span>
    );
  }

  if (added && (showAdded || sortKey === 'added')) {
    chips.push(
      <span
        key="added"
        className={styles.chip}
        title={formatDateTime(added, longDateFormat, timeFormat)}
      >
        <span className={styles.dateLabel}>{translate('Added')}</span>
        {relativeDate(added)}
      </span>
    );
  }

  if (showBookCount || sortKey === 'bookCount') {
    chips.push(
      <span key="bookCount" className={styles.chip}>
        {getBookCountLabel(bookCount)}
      </span>
    );
  }

  if (showSizeOnDisk || sortKey === 'sizeOnDisk') {
    chips.push(
      <span key="sizeOnDisk" className={styles.chip}>
        {formatBytes(sizeOnDisk)}
      </span>
    );
  }

  if (path && (showPath || sortKey === 'path')) {
    chips.push(
      <span key="path" className={classNames(styles.chipPath)} title={path}>
        {path}
      </span>
    );
  }

  if (!chips.length) {
    return null;
  }

  return <div className={styles.chipStrip}>{chips}</div>;
}

export default AuthorIndexOverviewInfo;
