import classNames from 'classnames';
import React, { ReactNode } from 'react';
import Icon from 'Components/Icon';
import TableRowCell from 'Components/Table/Cells/TableRowCell';
import Popover from 'Components/Tooltip/Popover';
import { icons, kinds, tooltipPositions } from 'Helpers/Props';
import {
  QueueTrackedDownloadState,
  QueueTrackedDownloadStatus,
  StatusMessage,
} from 'typings/Queue';
import translate from 'Utilities/String/translate';
import { QueueStatusChip } from './getQueueStatusChips';
import styles from './QueueStatusCell.module.css';

function getDetailedPopoverBody(statusMessages: StatusMessage[] = []) {
  return (
    <div>
      {statusMessages.map(({ title, messages }) => {
        return (
          <div key={title}>
            {title}
            <ul>
              {messages.map((message) => {
                return <li key={message}>{message}</li>;
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

interface QueueStatusCellProps {
  sourceTitle: string;
  status: string;
  trackedDownloadStatus?: QueueTrackedDownloadStatus;
  trackedDownloadState?: QueueTrackedDownloadState;
  statusMessages?: StatusMessage[];
  errorMessage?: string;
  chips?: QueueStatusChip[];
  actionError?: string | null;
  children?: ReactNode;
}

function QueueStatusCell(props: QueueStatusCellProps) {
  const {
    sourceTitle,
    status,
    trackedDownloadStatus = 'ok',
    trackedDownloadState = 'downloading',
    statusMessages,
    errorMessage,
    chips = [],
    actionError,
    children,
  } = props;

  // The row's triage buttons, only those that apply to it
  const actions = React.Children.toArray(children);
  const hasWarning = trackedDownloadStatus === 'warning';
  const hasError = trackedDownloadStatus === 'error';

  // status === 'downloading'
  let iconName = icons.DOWNLOADING;
  let iconKind = kinds.DEFAULT;
  let title = translate('Downloading');

  if (status === 'paused') {
    iconName = icons.PAUSED;
    title = translate('Paused');
  }

  if (status === 'queued') {
    iconName = icons.QUEUED;
    title = translate('Queued');
  }

  if (status === 'completed') {
    iconName = icons.DOWNLOADED;
    title = translate('Downloaded');

    if (trackedDownloadState === 'importPending') {
      title += ` - ${translate('WaitingToImport')}`;
      iconKind = kinds.PURPLE;
    }

    if (trackedDownloadState === 'importing') {
      title += ` - ${translate('Importing')}`;
      iconKind = kinds.PURPLE;
    }

    if (trackedDownloadState === 'downloadFailedPending') {
      title += ` - ${translate('WaitingToProcess')}`;
      iconKind = kinds.DANGER;
    }
  }

  if (hasWarning) {
    iconKind = kinds.WARNING;
  }

  if (status === 'delay') {
    iconName = icons.PENDING;
    title = translate('Pending');
  }

  if (status === 'downloadClientUnavailable') {
    iconName = icons.PENDING;
    iconKind = kinds.WARNING;
    title = translate('PendingDownloadClientUnavailable');
  }

  if (status === 'failed') {
    iconName = icons.DOWNLOADING;
    iconKind = kinds.DANGER;
    title = translate('DownloadFailed');
  }

  if (status === 'warning') {
    iconName = icons.DOWNLOADING;
    iconKind = kinds.WARNING;
    const warningMessage =
      errorMessage || translate('CheckDownloadClientForDetails');
    title = translate('DownloadWarning', { warningMessage });
  }

  if (hasError) {
    if (status === 'completed') {
      iconName = icons.DOWNLOAD;
      iconKind = kinds.DANGER;
      title = translate('ImportFailed', { sourceTitle });
    } else {
      iconName = icons.DOWNLOADING;
      iconKind = kinds.DANGER;
      title = translate('DownloadFailed');
    }
  }

  const hasTriage = chips.length > 0 || actions.length > 0;

  return (
    <TableRowCell
      className={hasTriage ? styles.statusWithChips : styles.status}
    >
      <div className={hasTriage ? styles.triage : undefined}>
        <span className={styles.statusIcon}>
          <Popover
            anchor={<Icon name={iconName} kind={iconKind} />}
            title={title}
            body={
              hasWarning || hasError
                ? getDetailedPopoverBody(statusMessages)
                : sourceTitle
            }
            position={tooltipPositions.RIGHT}
            canFlip={false}
          />
        </span>

        {hasTriage ? (
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
        ) : null}

        {hasTriage ? <div className={styles.actions}>{actions}</div> : null}
      </div>

      {actionError ? (
        <div className={styles.actionError}>{actionError}</div>
      ) : null}
    </TableRowCell>
  );
}

export default QueueStatusCell;
