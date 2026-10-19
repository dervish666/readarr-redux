import React from 'react';
import { AuthorStatus } from 'Author/Author';
import { getAuthorStatusDetails } from 'Author/AuthorStatus';
import Icon from 'Components/Icon';
import VirtualTableRowCell from 'Components/Table/Cells/VirtualTableRowCell';
import { icons } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import styles from './AuthorStatusCell.module.css';

interface AuthorStatusCellProps {
  className: string;
  monitored: boolean;
  status: AuthorStatus;
}

function AuthorStatusCell({
  className,
  monitored,
  status,
}: AuthorStatusCellProps) {
  const statusDetails = getAuthorStatusDetails(status);

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

      <Icon
        className={styles.statusIcon}
        name={statusDetails.icon}
        title={`${statusDetails.title}: ${statusDetails.message}`}
      />
    </VirtualTableRowCell>
  );
}

export default AuthorStatusCell;
