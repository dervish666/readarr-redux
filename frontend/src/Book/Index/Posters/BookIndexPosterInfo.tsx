import React from 'react';
import Author from 'Author/Author';
import Book from 'Book/Book';
import { QualityProfileModel } from 'Settings/Profiles/Quality/useQualityProfiles';
import { useUiSettingsValues } from 'Settings/UI/useUiSettings';
import getRelativeDate from 'Utilities/Date/getRelativeDate';
import formatBytes from 'Utilities/Number/formatBytes';
import translate from 'Utilities/String/translate';
import styles from './BookIndexPosterInfo.module.css';

interface BookIndexPosterInfoProps {
  book: Book;
  author?: Author;
  qualityProfile?: QualityProfileModel;
  showQualityProfile: boolean;
  sortKey: string;
}

export function getBookFileCountLabel(bookFileCount: number) {
  if (bookFileCount === 0) {
    return translate('NoFiles');
  }

  if (bookFileCount === 1) {
    return translate('OneFile');
  }

  return translate('CountFiles', { count: bookFileCount });
}

// The line under a cover that shows the value being sorted by.
function BookIndexPosterInfo(props: BookIndexPosterInfoProps) {
  const { book, author, qualityProfile, showQualityProfile, sortKey } = props;

  const { showRelativeDates, shortDateFormat, timeFormat } =
    useUiSettingsValues();

  const { added, releaseDate, statistics } = book;

  const relativeDate = (date: string) =>
    getRelativeDate(date, shortDateFormat, showRelativeDates, {
      timeFormat,
      timeForToday: false,
    });

  let info: string | null = null;

  if (sortKey === 'qualityProfileId' && !showQualityProfile) {
    info = qualityProfile?.name ?? null;
  } else if (sortKey === 'added' && added) {
    info = `${translate('Added')} ${relativeDate(added)}`;
  } else if (sortKey === 'releaseDate' && releaseDate) {
    info = `${translate('Released')} ${relativeDate(releaseDate)}`;
  } else if (sortKey === 'bookFileCount') {
    info = getBookFileCountLabel(statistics?.bookFileCount ?? 0);
  } else if (sortKey === 'path') {
    info = author?.path ?? null;
  } else if (sortKey === 'sizeOnDisk') {
    info = formatBytes(statistics?.sizeOnDisk ?? 0);
  }

  if (!info) {
    return null;
  }

  return (
    <div className={styles.info} title={info}>
      {info}
    </div>
  );
}

export default BookIndexPosterInfo;
