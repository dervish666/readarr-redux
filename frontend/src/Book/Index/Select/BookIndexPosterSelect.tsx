import React, { SyntheticEvent, useCallback } from 'react';
import Icon from 'Components/Icon';
import Link from 'Components/Link/Link';
import { icons } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import {
  useBookIndexSelect,
  useIsBookSelected,
} from './BookIndexSelectContext';
import styles from './BookIndexPosterSelect.css';

interface BookIndexPosterSelectProps {
  bookId: number;
  titleSlug: string;
}

// Covers the cover in select mode: a press selects (shift for a range), ctrl/cmd
// opens the book in a new tab.
function BookIndexPosterSelect({
  bookId,
  titleSlug,
}: BookIndexPosterSelectProps) {
  const { onSelectedChange } = useBookIndexSelect();
  const isSelected = useIsBookSelected(bookId);

  const handlePress = useCallback(
    (event: SyntheticEvent) => {
      const nativeEvent = event.nativeEvent as MouseEvent;

      if (nativeEvent.ctrlKey || nativeEvent.metaKey) {
        window.open(`${window.Readarr.urlBase}/book/${titleSlug}`, '_blank');
        return;
      }

      onSelectedChange({
        id: bookId,
        value: !isSelected,
        shiftKey: nativeEvent.shiftKey,
      });
    },
    [bookId, titleSlug, isSelected, onSelectedChange]
  );

  return (
    <Link
      className={styles.checkButton}
      aria-label={translate('Select')}
      aria-pressed={isSelected}
      onPress={handlePress}
    >
      <span className={styles.checkContainer}>
        <Icon
          className={isSelected ? styles.selected : styles.unselected}
          name={isSelected ? icons.CHECK_CIRCLE : icons.CIRCLE}
          size={20}
        />
      </span>
    </Link>
  );
}

export default BookIndexPosterSelect;
