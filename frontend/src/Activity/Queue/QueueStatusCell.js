import PropTypes from 'prop-types';
import React from 'react';
import Icon from 'Components/Icon';
import Label from 'Components/Label';
import TableRowCell from 'Components/Table/Cells/TableRowCell';
import Popover from 'Components/Tooltip/Popover';
import { icons, kinds, tooltipPositions } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import styles from './QueueStatusCell.css';

function getDetailedPopoverBody(statusMessages) {
  return (
    <div>
      {
        statusMessages.map(({ title, messages }) => {
          return (
            <div key={title}>
              {title}
              <ul>
                {
                  messages.map((message) => {
                    return (
                      <li key={message}>
                        {message}
                      </li>
                    );
                  })
                }
              </ul>
            </div>
          );
        })
      }
    </div>
  );
}

function QueueStatusCell(props) {
  const {
    sourceTitle,
    status,
    trackedDownloadStatus,
    trackedDownloadState,
    statusMessages,
    errorMessage,
    chips,
    children
  } = props;

  // The row's triage buttons, only those that apply to it
  const actions = React.Children.toArray(children);
  const hasWarning = trackedDownloadStatus === 'warning';
  const hasError = trackedDownloadStatus === 'error';

  // status === 'downloading'
  let iconName = icons.DOWNLOADING;
  let iconKind = kinds.DEFAULT;
  let title = translate('Title');

  if (status === 'paused') {
    iconName = icons.PAUSED;
    title = 'Paused';
  }

  if (status === 'queued') {
    iconName = icons.QUEUED;
    title = 'Queued';
  }

  if (status === 'completed') {
    iconName = icons.DOWNLOADED;
    title = 'Downloaded';

    if (trackedDownloadState === 'importPending') {
      title += ' - Waiting to Import';
      iconKind = kinds.PURPLE;
    }

    if (trackedDownloadState === 'importing') {
      title += ' - Importing';
      iconKind = kinds.PURPLE;
    }

    if (trackedDownloadState === 'failedPending') {
      title += ' - Waiting to Process';
      iconKind = kinds.DANGER;
    }
  }

  if (hasWarning) {
    iconKind = kinds.WARNING;
  }

  if (status === 'delay') {
    iconName = icons.PENDING;
    title = 'Pending';
  }

  if (status === 'downloadClientUnavailable') {
    iconName = icons.PENDING;
    iconKind = kinds.WARNING;
    title = 'Pending - Download client is unavailable';
  }

  if (status === 'failed') {
    iconName = icons.DOWNLOADING;
    iconKind = kinds.DANGER;
    title = 'Download failed';
  }

  if (status === 'warning') {
    iconName = icons.DOWNLOADING;
    iconKind = kinds.WARNING;
    title = `Download warning: ${errorMessage || 'check download client for more details'}`;
  }

  if (hasError) {
    if (status === 'completed') {
      iconName = icons.DOWNLOAD;
      iconKind = kinds.DANGER;
      title = `Import failed: ${sourceTitle}`;
    } else {
      iconName = icons.DOWNLOADING;
      iconKind = kinds.DANGER;
      title = 'Download failed';
    }
  }

  return (
    <TableRowCell className={chips.length || actions.length ? styles.statusWithChips : styles.status}>
      <div className={styles.content}>
        <Popover
          anchor={
            <Icon
              name={iconName}
              kind={iconKind}
            />
          }
          title={title}
          body={hasWarning || hasError ? getDetailedPopoverBody(statusMessages) : sourceTitle}
          position={tooltipPositions.RIGHT}
          canFlip={false}
        />

        {
          chips.map((chip) => {
            return (
              <Label
                key={chip.key}
                kind={chip.kind}
                title={chip.details.join('\n')}
              >
                {chip.label}
              </Label>
            );
          })
        }
      </div>

      {
        actions.length > 0 &&
          <div className={styles.actions}>
            {actions}
          </div>
      }
    </TableRowCell>
  );
}

QueueStatusCell.propTypes = {
  sourceTitle: PropTypes.string.isRequired,
  status: PropTypes.string.isRequired,
  trackedDownloadStatus: PropTypes.string.isRequired,
  trackedDownloadState: PropTypes.string.isRequired,
  statusMessages: PropTypes.arrayOf(PropTypes.object),
  errorMessage: PropTypes.string,
  chips: PropTypes.arrayOf(PropTypes.object).isRequired,
  children: PropTypes.node
};

QueueStatusCell.defaultProps = {
  chips: [],
  trackedDownloadStatus: 'Ok',
  trackedDownloadState: 'Downloading'
};

export default QueueStatusCell;
