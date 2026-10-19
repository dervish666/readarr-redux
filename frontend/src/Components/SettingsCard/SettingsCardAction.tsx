import React from 'react';
import IconButton from 'Components/Link/IconButton';
import styles from './SettingsCard.css';

interface SettingsCardActionProps {
  name: object;
  title: string;
  'aria-label': string;
  onPress: () => void;
}

// An icon button in a settings card's name row. IconButton hardcodes an aria-label,
// so callers always pass their own.
function SettingsCardAction(props: SettingsCardActionProps) {
  return <IconButton className={styles.actionButton} {...props} />;
}

export default SettingsCardAction;
