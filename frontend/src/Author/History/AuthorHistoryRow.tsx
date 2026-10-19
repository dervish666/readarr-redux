import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useState } from 'react';
import HistoryDetails from 'Activity/History/Details/HistoryDetails';
import HistoryEventTypeCell from 'Activity/History/HistoryEventTypeCell';
import { useMarkAsFailed } from 'Activity/History/useHistory';
import BookFormats from 'Book/BookFormats';
import BookQuality from 'Book/BookQuality';
import Icon from 'Components/Icon';
import IconButton from 'Components/Link/IconButton';
import ConfirmModal from 'Components/Modal/ConfirmModal';
import RelativeDateCellConnector from 'Components/Table/Cells/RelativeDateCellConnector';
import TableRowCell from 'Components/Table/Cells/TableRowCell';
import TableRow from 'Components/Table/TableRow';
import Popover from 'Components/Tooltip/Popover';
import { icons, kinds, tooltipPositions } from 'Helpers/Props';
import History, { HistoryEventType } from 'typings/History';
import formatCustomFormatScore from 'Utilities/Number/formatCustomFormatScore';
import translate from 'Utilities/String/translate';
import { AUTHOR_HISTORY_PATH } from './useAuthorHistory';
import styles from './AuthorHistoryRow.module.css';

function getTitle(eventType: HistoryEventType) {
  switch (eventType) {
    case 'grabbed':
      return 'Grabbed';
    case 'downloadImported':
      return 'Download Completed';
    case 'bookFileImported':
      return 'Book Imported';
    case 'downloadFailed':
      return 'Download Failed';
    case 'bookFileDeleted':
      return 'Book File Deleted';
    case 'bookFileRenamed':
      return 'Book File Renamed';
    case 'bookFileRetagged':
      return 'Book File Tags Updated';
    case 'bookImportIncomplete':
      return 'Book Import Incomplete';
    default:
      return 'Unknown';
  }
}

interface AuthorHistoryRowProps {
  item: History;
}

function AuthorHistoryRow({ item }: AuthorHistoryRowProps) {
  const {
    id,
    eventType,
    sourceTitle,
    quality,
    qualityCutoffNotMet,
    customFormats = [],
    customFormatScore,
    date,
    data,
    book,
  } = item;

  const queryClient = useQueryClient();
  const { markAsFailed } = useMarkAsFailed(id);
  const [isMarkAsFailedModalOpen, setIsMarkAsFailedModalOpen] = useState(false);

  const handleMarkAsFailedPress = useCallback(() => {
    setIsMarkAsFailedModalOpen(true);
  }, []);

  const handleConfirmMarkAsFailed = useCallback(() => {
    markAsFailed(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [AUTHOR_HISTORY_PATH] });
      },
    });

    setIsMarkAsFailedModalOpen(false);
  }, [markAsFailed, queryClient]);

  const handleMarkAsFailedModalClose = useCallback(() => {
    setIsMarkAsFailedModalOpen(false);
  }, []);

  return (
    <TableRow>
      <HistoryEventTypeCell eventType={eventType} data={data} />

      <TableRowCell>{book?.title ?? ''}</TableRowCell>

      <TableRowCell className={styles.sourceTitle}>{sourceTitle}</TableRowCell>

      <TableRowCell>
        <BookQuality quality={quality} isCutoffNotMet={qualityCutoffNotMet} />
      </TableRowCell>

      <TableRowCell>
        <BookFormats formats={customFormats} />
      </TableRowCell>

      <TableRowCell>
        {formatCustomFormatScore(customFormatScore, customFormats.length)}
      </TableRowCell>

      <RelativeDateCellConnector date={date} />

      <TableRowCell className={styles.actions}>
        <Popover
          anchor={<Icon name={icons.INFO} />}
          title={getTitle(eventType)}
          body={
            <HistoryDetails
              eventType={eventType}
              sourceTitle={sourceTitle}
              data={data}
            />
          }
          position={tooltipPositions.LEFT}
        />

        {eventType === 'grabbed' ? (
          <IconButton
            title={translate('MarkAsFailed')}
            aria-label={translate('MarkAsFailed')}
            name={icons.REMOVE}
            size={14}
            onPress={handleMarkAsFailedPress}
          />
        ) : null}
      </TableRowCell>

      <ConfirmModal
        isOpen={isMarkAsFailedModalOpen}
        kind={kinds.DANGER}
        title={translate('MarkAsFailed')}
        message={translate('MarkAsFailedMessageText', { 0: sourceTitle })}
        confirmLabel={translate('MarkAsFailed')}
        onConfirm={handleConfirmMarkAsFailed}
        onCancel={handleMarkAsFailedModalClose}
      />
    </TableRow>
  );
}

export default AuthorHistoryRow;
