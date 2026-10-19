import React from 'react';
import SpinnerIcon from 'Components/SpinnerIcon';
import { icons } from 'Helpers/Props';
import styles from './AuthorEditorFooterLabel.css';

interface AuthorEditorFooterLabelProps {
  className?: string;
  label: string;
  isSaving: boolean;
}

function AuthorEditorFooterLabel({
  className = styles.label,
  label,
  isSaving,
}: AuthorEditorFooterLabelProps) {
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

export default AuthorEditorFooterLabel;
