import React from 'react';
import SpinnerIcon from 'Components/SpinnerIcon';
import { icons } from 'Helpers/Props';
import styles from './BookEditorFooterLabel.css';

interface BookEditorFooterLabelProps {
  className?: string;
  label: string;
  isSaving: boolean;
}

function BookEditorFooterLabel({
  className = styles.label,
  label,
  isSaving,
}: BookEditorFooterLabelProps) {
  return (
    <div className={className}>
      {label}

      {isSaving ? (
        <SpinnerIcon
          className={styles.savingIcon}
          name={icons.SPINNER}
          isSpinning={true}
        />
      ) : null}
    </div>
  );
}

export default BookEditorFooterLabel;
