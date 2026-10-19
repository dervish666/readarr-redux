import React, { SyntheticEvent, useCallback } from 'react';
import Icon from 'Components/Icon';
import Link from 'Components/Link/Link';
import { icons } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import {
  useAuthorIndexSelect,
  useIsAuthorSelected,
} from './AuthorIndexSelectContext';
import styles from './AuthorIndexPosterSelect.css';

interface AuthorIndexPosterSelectProps {
  authorId: number;
  titleSlug: string;
}

// Covers the poster in select mode: a press selects (shift for a range), ctrl/cmd
// opens the author in a new tab.
function AuthorIndexPosterSelect({
  authorId,
  titleSlug,
}: AuthorIndexPosterSelectProps) {
  const { onSelectedChange } = useAuthorIndexSelect();
  const isSelected = useIsAuthorSelected(authorId);

  const handlePress = useCallback(
    (event: SyntheticEvent) => {
      const nativeEvent = event.nativeEvent as MouseEvent;

      if (nativeEvent.ctrlKey || nativeEvent.metaKey) {
        window.open(`${window.Readarr.urlBase}/author/${titleSlug}`, '_blank');
        return;
      }

      onSelectedChange({
        id: authorId,
        value: !isSelected,
        shiftKey: nativeEvent.shiftKey,
      });
    },
    [authorId, titleSlug, isSelected, onSelectedChange]
  );

  return (
    <Link
      className={styles.checkButton}
      aria-label={translate('Select')}
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

export default AuthorIndexPosterSelect;
