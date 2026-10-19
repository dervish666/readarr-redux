import React from 'react';
import Icon from 'Components/Icon';
import VirtualTableRowCell from 'Components/Table/Cells/VirtualTableRowCell';
import { icons } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import styles from './BookStatusCell.css';

interface BookStatusCellProps {
  className: string;
  monitored: boolean;
}

function BookStatusCell({ className, monitored }: BookStatusCellProps) {
  return (
    <VirtualTableRowCell className={className}>
      <Icon
        className={styles.statusIcon}
        name={monitored ? icons.MONITORED : icons.UNMONITORED}
        title={
          monitored
            ? translate('MonitoredAuthorIsMonitored')
            : translate('MonitoredAuthorIsUnmonitored')
        }
      />
    </VirtualTableRowCell>
  );
}

export default BookStatusCell;
