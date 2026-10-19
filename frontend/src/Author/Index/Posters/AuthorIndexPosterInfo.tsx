import React from 'react';
import Author from 'Author/Author';
import { MetadataProfileModel } from 'Settings/Profiles/Metadata/useMetadataProfiles';
import { QualityProfileModel } from 'Settings/Profiles/Quality/useQualityProfiles';
import { useUiSettingsValues } from 'Settings/UI/useUiSettings';
import getRelativeDate from 'Utilities/Date/getRelativeDate';
import formatBytes from 'Utilities/Number/formatBytes';
import translate from 'Utilities/String/translate';
import styles from './AuthorIndexPosterInfo.module.css';

interface AuthorIndexPosterInfoProps {
  author: Author;
  qualityProfile?: QualityProfileModel;
  metadataProfile?: MetadataProfileModel;
  showQualityProfile: boolean;
  sortKey: string;
}

export function getBookCountLabel(bookCount: number) {
  if (bookCount === 0) {
    return translate('NoBooks');
  }

  if (bookCount === 1) {
    return translate('OneBook');
  }

  return translate('CountBooks', { count: bookCount });
}

// The line under a poster that shows the value being sorted by.
function AuthorIndexPosterInfo(props: AuthorIndexPosterInfoProps) {
  const {
    author,
    qualityProfile,
    metadataProfile,
    showQualityProfile,
    sortKey,
  } = props;

  const { showRelativeDates, shortDateFormat, timeFormat } =
    useUiSettingsValues();

  const { added, nextBook, lastBook, path, statistics } = author;

  const relativeDate = (date: string) =>
    getRelativeDate(date, shortDateFormat, showRelativeDates, {
      timeFormat,
      timeForToday: false,
    });

  let info: string | null = null;

  if (sortKey === 'qualityProfileId' && !showQualityProfile) {
    info = qualityProfile?.name ?? null;
  } else if (sortKey === 'metadataProfileId') {
    info = metadataProfile?.name ?? null;
  } else if (sortKey === 'added' && added) {
    info = `${translate('Added')} ${relativeDate(added)}`;
  } else if (sortKey === 'nextBook' && nextBook?.releaseDate) {
    info = `${translate('NextBook')} ${relativeDate(nextBook.releaseDate)}`;
  } else if (sortKey === 'lastBook' && lastBook?.releaseDate) {
    info = `${translate('LastBook')} ${relativeDate(lastBook.releaseDate)}`;
  } else if (sortKey === 'bookCount') {
    info = getBookCountLabel(statistics?.bookCount ?? 0);
  } else if (sortKey === 'path') {
    info = path;
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

export default AuthorIndexPosterInfo;
