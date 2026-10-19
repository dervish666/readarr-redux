import React from 'react';
import { AuthorStatus } from 'Author/Author';
import ProgressBar from 'Components/ProgressBar';
import { sizes } from 'Helpers/Props';
import getProgressBarKind from 'Utilities/Author/getProgressBarKind';
import translate from 'Utilities/String/translate';
import styles from './AuthorIndexProgressBar.module.css';

interface AuthorIndexProgressBarProps {
  monitored: boolean;
  status: AuthorStatus;
  bookCount: number;
  availableBookCount: number;
  bookFileCount: number;
  totalBookCount: number;
  width: number;
  detailedProgressBar: boolean;
  isStandalone?: boolean;
}

// Readarr counts progress by available books (books with a file), not files.
function AuthorIndexProgressBar(props: AuthorIndexProgressBarProps) {
  const {
    monitored,
    status,
    bookCount,
    availableBookCount,
    bookFileCount,
    totalBookCount,
    width,
    detailedProgressBar,
    isStandalone = false,
  } = props;

  const progress = bookCount ? (availableBookCount / bookCount) * 100 : 100;
  const text = `${availableBookCount} / ${bookCount}`;

  let containerClassName: string | undefined = styles.progress;

  if (isStandalone) {
    containerClassName = undefined;
  } else if (detailedProgressBar) {
    containerClassName = styles.progressDetailed;
  }

  return (
    <ProgressBar
      className={
        detailedProgressBar ? styles.progressBarDetailed : styles.progressBar
      }
      containerClassName={containerClassName}
      progress={progress}
      kind={getProgressBarKind(status, monitored, progress)}
      size={detailedProgressBar ? sizes.MEDIUM : sizes.SMALL}
      showText={detailedProgressBar}
      text={text}
      title={translate('AuthorProgressBarText', {
        bookCount,
        availableBookCount,
        bookFileCount,
        totalBookCount,
      })}
      width={width}
    />
  );
}

export default AuthorIndexProgressBar;
