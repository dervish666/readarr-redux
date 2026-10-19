import React from 'react';
import Icon from 'Components/Icon';
import TableRowCell from 'Components/Table/Cells/TableRowCell';
import { icons, kinds } from 'Helpers/Props';
import { HistoryData, HistoryEventType } from 'typings/History';
import translate from 'Utilities/String/translate';
import styles from './HistoryEventTypeCell.css';

function getIconName(eventType: HistoryEventType) {
  switch (eventType) {
    case 'grabbed':
      return icons.DOWNLOADING;
    case 'bookFileImported':
      return icons.DOWNLOADED;
    case 'downloadFailed':
      return icons.DOWNLOADING;
    case 'bookFileDeleted':
      return icons.DELETE;
    case 'bookFileRenamed':
      return icons.ORGANIZE;
    case 'bookFileRetagged':
      return icons.RETAG;
    case 'bookImportIncomplete':
      return icons.DOWNLOADED;
    case 'downloadIgnored':
      return icons.IGNORE;
    default:
      return icons.UNKNOWN;
  }
}

function getIconKind(eventType: HistoryEventType) {
  switch (eventType) {
    case 'downloadFailed':
      return kinds.DANGER;
    case 'bookImportIncomplete':
      return kinds.WARNING;
    default:
      return kinds.DEFAULT;
  }
}

function getTooltip(eventType: HistoryEventType, data: HistoryData) {
  switch (eventType) {
    case 'grabbed':
      return translate('BookGrabbedTooltip', {
        indexer: data.indexer ?? '',
        downloadClient: data.downloadClient ?? '',
      });
    case 'bookFileImported':
      return translate('BookImportedTooltip');
    case 'downloadFailed':
      return translate('DownloadFailedBookTooltip');
    case 'bookFileDeleted':
      return translate('BookFileDeletedTooltip');
    case 'bookFileRenamed':
      return translate('BookFileRenamedTooltip');
    case 'bookFileRetagged':
      return translate('BookFileRetaggedTooltip');
    case 'bookImportIncomplete':
      return translate('BookImportIncompleteTooltip');
    case 'downloadIgnored':
      return translate('DownloadIgnoredBookTooltip');
    default:
      return translate('UnknownEventTooltip');
  }
}

interface HistoryEventTypeCellProps {
  eventType: HistoryEventType;
  data?: HistoryData;
}

// Shared with the author and book history tables, which still pass redux rows.
function HistoryEventTypeCell({
  eventType,
  data = {},
}: HistoryEventTypeCellProps) {
  return (
    <TableRowCell className={styles.cell} title={getTooltip(eventType, data)}>
      <Icon name={getIconName(eventType)} kind={getIconKind(eventType)} />
    </TableRowCell>
  );
}

export default HistoryEventTypeCell;
