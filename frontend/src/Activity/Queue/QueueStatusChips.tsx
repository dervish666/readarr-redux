import classNames from 'classnames';
import React from 'react';
import Icon from 'Components/Icon';
import { QueueStatusChip } from './getQueueStatusChips';
import styles from './QueueStatusChips.module.css';

interface QueueStatusChipsProps {
  chips: QueueStatusChip[];
}

function QueueStatusChips({ chips }: QueueStatusChipsProps) {
  return (
    <ul className={styles.chips}>
      {chips.map((chip) => {
        return (
          <li
            key={chip.key}
            className={classNames(
              styles.chip,
              styles[chip.kind as keyof typeof styles]
            )}
            title={[chip.label, ...chip.details].join('\n')}
          >
            <Icon name={chip.icon} size={14} aria-hidden={true} />
            <span className={styles.chipLabel}>{chip.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default QueueStatusChips;
