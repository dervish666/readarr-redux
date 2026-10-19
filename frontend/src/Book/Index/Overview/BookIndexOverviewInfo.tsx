import React, { ReactNode } from 'react';
import Author from 'Author/Author';
import Book from 'Book/Book';
import { QualityProfileModel } from 'Settings/Profiles/Quality/useQualityProfiles';
import { useUiSettingsValues } from 'Settings/UI/useUiSettings';
import formatDateTime from 'Utilities/Date/formatDateTime';
import getRelativeDate from 'Utilities/Date/getRelativeDate';
import formatBytes from 'Utilities/Number/formatBytes';
import translate from 'Utilities/String/translate';
import { BookIndexOverviewOptions } from '../bookIndexOptionsStore';
import styles from './BookIndexOverviewInfo.module.css';

interface BookIndexOverviewInfoProps {
  book: Book;
  author?: Author;
  qualityProfile?: QualityProfileModel;
  overviewOptions: BookIndexOverviewOptions;
  sortKey: string;
}

// The chip strip under an overview: each detail shows when its option is on or the
// index is sorted by it.
function BookIndexOverviewInfo(props: BookIndexOverviewInfoProps) {
  const { book, author, qualityProfile, overviewOptions, sortKey } = props;

  const { shortDateFormat, showRelativeDates, longDateFormat, timeFormat } =
    useUiSettingsValues();

  const {
    showMonitored,
    showQualityProfile,
    showReleaseDate,
    showAdded,
    showPath,
    showSizeOnDisk,
  } = overviewOptions;

  const { monitored, releaseDate, added, statistics } = book;
  const path = author?.path;
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

  if (releaseDate && (showReleaseDate || sortKey === 'releaseDate')) {
    chips.push(
      <span
        key="releaseDate"
        className={styles.chip}
        title={formatDateTime(releaseDate, longDateFormat, timeFormat)}
      >
        <span className={styles.dateLabel}>{translate('ReleaseDate')}</span>
        {relativeDate(releaseDate)}
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

  if (showSizeOnDisk || sortKey === 'sizeOnDisk') {
    chips.push(
      <span key="sizeOnDisk" className={styles.chip}>
        {formatBytes(sizeOnDisk)}
      </span>
    );
  }

  if (path && (showPath || sortKey === 'path')) {
    chips.push(
      <span key="path" className={styles.chipPath} title={path}>
        {path}
      </span>
    );
  }

  if (!chips.length) {
    return null;
  }

  return <div className={styles.chipStrip}>{chips}</div>;
}

export default BookIndexOverviewInfo;
