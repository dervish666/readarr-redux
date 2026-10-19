import React from 'react';
import ProgressBar from 'Components/ProgressBar';
import { sizes } from 'Helpers/Props';
import getProgressBarKind from 'Utilities/Author/getProgressBarKind';
import translate from 'Utilities/String/translate';
import styles from './BookIndexProgressBar.css';

interface BookIndexProgressBarProps {
  monitored: boolean;
  bookCount: number;
  bookFileCount: number;
  totalBookCount: number;
  width: number;
  detailedProgressBar: boolean;
}

// A book's bar is always full; its colour says whether the book has a file. The
// counts are the redux index's: editions with a file over all editions.
function BookIndexProgressBar(props: BookIndexProgressBarProps) {
  const {
    monitored,
    bookCount,
    bookFileCount,
    totalBookCount,
    width,
    detailedProgressBar,
  } = props;

  const progress =
    bookFileCount && bookCount ? (totalBookCount / bookCount) * 100 : 0;
  const shownBookCount = bookFileCount ? bookCount : 0;

  return (
    <ProgressBar
      className={
        detailedProgressBar ? styles.progressBarDetailed : styles.progressBar
      }
      containerClassName={
        detailedProgressBar ? styles.progressDetailed : styles.progress
      }
      progress={100}
      kind={getProgressBarKind('ended', monitored, progress)}
      size={detailedProgressBar ? sizes.MEDIUM : sizes.SMALL}
      showText={detailedProgressBar}
      text={`${shownBookCount} / ${totalBookCount}`}
      title={translate('BookProgressBarText', {
        bookCount: shownBookCount,
        bookFileCount,
        totalBookCount,
      })}
      width={width}
    />
  );
}

export default BookIndexProgressBar;
