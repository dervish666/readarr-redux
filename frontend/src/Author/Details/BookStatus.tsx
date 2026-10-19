import React from 'react';
import BookQuality from 'Book/BookQuality';
import BookFile from 'BookFile/BookFile';
import Label from 'Components/Label';
import { kinds } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import styles from './BookStatus.css';

interface BookStatusProps {
  isAvailable: boolean;
  monitored: boolean;
  bookFile?: BookFile;
}

function BookStatus({ isAvailable, monitored, bookFile }: BookStatusProps) {
  if (bookFile) {
    const quality = bookFile.quality;

    return (
      <div className={styles.center}>
        <BookQuality
          title={quality.quality.name}
          size={bookFile.size}
          quality={quality}
          isMonitored={monitored}
          isCutoffNotMet={bookFile.qualityCutoffNotMet}
        />
      </div>
    );
  }

  if (!monitored) {
    return (
      <div className={styles.center}>
        <Label title={translate('NotMonitored')} kind={kinds.WARNING}>
          {translate('NotMonitored')}
        </Label>
      </div>
    );
  }

  if (isAvailable) {
    return (
      <div className={styles.center}>
        <Label title={translate('BookAvailableButMissing')} kind={kinds.DANGER}>
          {translate('Missing')}
        </Label>
      </div>
    );
  }

  return (
    <div className={styles.center}>
      <Label title={translate('NotAvailable')} kind={kinds.INFO}>
        {translate('NotAvailable')}
      </Label>
    </div>
  );
}

export default BookStatus;
