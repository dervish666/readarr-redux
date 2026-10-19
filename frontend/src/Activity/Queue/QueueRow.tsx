import React, { useCallback, useState } from 'react';
import AuthorNameLink from 'Author/AuthorNameLink';
import BookFormats from 'Book/BookFormats';
import BookQuality from 'Book/BookQuality';
import BookTitleLink from 'Book/BookTitleLink';
import Icon from 'Components/Icon';
import Button from 'Components/Link/Button';
import IconButton from 'Components/Link/IconButton';
import SpinnerButton from 'Components/Link/SpinnerButton';
import SpinnerIconButton from 'Components/Link/SpinnerIconButton';
import ConfirmModal from 'Components/Modal/ConfirmModal';
import ProgressBar from 'Components/ProgressBar';
import RelativeDateCellConnector from 'Components/Table/Cells/RelativeDateCellConnector';
import TableRowCell from 'Components/Table/Cells/TableRowCell';
import TableSelectCell from 'Components/Table/Cells/TableSelectCell';
import Column from 'Components/Table/Column';
import TableRow from 'Components/Table/TableRow';
import Popover from 'Components/Tooltip/Popover';
import Tooltip from 'Components/Tooltip/Tooltip';
import { icons, kinds, sizes, tooltipPositions } from 'Helpers/Props';
import InteractiveImportModal from 'InteractiveImport/InteractiveImportModal';
import { useUiSettingsValues } from 'Settings/UI/useUiSettings';
import { SelectStateInputProps } from 'typings/props';
import Queue from 'typings/Queue';
import formatBytes from 'Utilities/Number/formatBytes';
import formatCustomFormatScore from 'Utilities/Number/formatCustomFormatScore';
import translate from 'Utilities/String/translate';
import getQueueStatusChips, {
  canRetryImport,
  CLOSE_MATCH,
  DESTINATION_EXISTS,
} from './getQueueStatusChips';
import ImportDestinationsModal from './ImportDestinations/ImportDestinationsModal';
import { getImportErrorMessage } from './ImportDestinations/ImportDestinationsModalContent';
import ProtocolLabel from './ProtocolLabel';
import QueueStatusCell from './QueueStatusCell';
import RemoveQueueItemModal from './RemoveQueueItemModal';
import TimeLeftCell from './TimeLeftCell';
import {
  QueueRemovalOptions,
  useGrabQueueItem,
  useImportQueueItem,
  useRemoveQueueItem,
} from './useQueue';
import styles from './QueueRow.module.css';

interface QueueRowProps extends Queue {
  isSelected?: boolean;
  columns: Column[];
  onSelectedChange: (props: SelectStateInputProps) => void;
  onQueueRowModalOpenOrClose: (isOpen: boolean) => void;
}

function QueueRow(props: QueueRowProps) {
  const {
    id,
    downloadId,
    title,
    status,
    trackedDownloadStatus,
    trackedDownloadState,
    statusMessages,
    errorMessage,
    author,
    book,
    quality,
    customFormats = [],
    customFormatScore,
    protocol,
    indexer,
    outputPath,
    downloadClient,
    downloadClientHasPostImportCategory,
    downloadForced,
    estimatedCompletionTime,
    timeleft,
    size,
    sizeleft,
    isSelected,
    columns,
    onSelectedChange,
    onQueueRowModalOpenOrClose,
  } = props;

  const { showRelativeDates, shortDateFormat, timeFormat } =
    useUiSettingsValues();

  const { removeQueueItem, isRemoving } = useRemoveQueueItem(id);
  const { grabQueueItem, isGrabbing, grabError } = useGrabQueueItem(id);
  const { importQueueItem, isImporting, importError } = useImportQueueItem(id);

  const [isRemoveQueueItemModalOpen, setIsRemoveQueueItemModalOpen] =
    useState(false);
  const [isInteractiveImportModalOpen, setIsInteractiveImportModalOpen] =
    useState(false);
  const [isBlocklistAndSearchModalOpen, setIsBlocklistAndSearchModalOpen] =
    useState(false);
  const [isImportDestinationsModalOpen, setIsImportDestinationsModalOpen] =
    useState(false);

  const handleRemoveQueueItemPress = useCallback(() => {
    onQueueRowModalOpenOrClose(true);
    setIsRemoveQueueItemModalOpen(true);
  }, [onQueueRowModalOpenOrClose]);

  const handleRemoveQueueItemModalConfirmed = useCallback(
    (options: QueueRemovalOptions) => {
      onQueueRowModalOpenOrClose(false);
      removeQueueItem(options);
      setIsRemoveQueueItemModalOpen(false);
    },
    [removeQueueItem, onQueueRowModalOpenOrClose]
  );

  const handleRemoveQueueItemModalClose = useCallback(() => {
    onQueueRowModalOpenOrClose(false);
    setIsRemoveQueueItemModalOpen(false);
  }, [onQueueRowModalOpenOrClose]);

  const handleInteractiveImportPress = useCallback(() => {
    onQueueRowModalOpenOrClose(true);
    setIsInteractiveImportModalOpen(true);
  }, [onQueueRowModalOpenOrClose]);

  const handleInteractiveImportModalClose = useCallback(() => {
    onQueueRowModalOpenOrClose(false);
    setIsInteractiveImportModalOpen(false);
  }, [onQueueRowModalOpenOrClose]);

  const handleGrabPress = useCallback(() => {
    grabQueueItem();
  }, [grabQueueItem]);

  const handleImportAnywayPress = useCallback(() => {
    importQueueItem({ ignoreMatchThreshold: true, replaceDestination: false });
  }, [importQueueItem]);

  const handleBlocklistAndSearchPress = useCallback(() => {
    onQueueRowModalOpenOrClose(true);
    setIsBlocklistAndSearchModalOpen(true);
  }, [onQueueRowModalOpenOrClose]);

  const handleBlocklistAndSearchConfirmed = useCallback(() => {
    onQueueRowModalOpenOrClose(false);
    removeQueueItem({
      remove: true,
      changeCategory: false,
      blocklist: true,
      skipRedownload: false,
    });
    setIsBlocklistAndSearchModalOpen(false);
  }, [removeQueueItem, onQueueRowModalOpenOrClose]);

  const handleBlocklistAndSearchModalClose = useCallback(() => {
    onQueueRowModalOpenOrClose(false);
    setIsBlocklistAndSearchModalOpen(false);
  }, [onQueueRowModalOpenOrClose]);

  const handleComparePress = useCallback(() => {
    onQueueRowModalOpenOrClose(true);
    setIsImportDestinationsModalOpen(true);
  }, [onQueueRowModalOpenOrClose]);

  const handleImportDestinationsModalClose = useCallback(() => {
    onQueueRowModalOpenOrClose(false);
    setIsImportDestinationsModalOpen(false);
  }, [onQueueRowModalOpenOrClose]);

  const handleImportAndReplacePress = useCallback(() => {
    // The user has seen which book the files go to, so the match threshold doesn't hold them back either
    importQueueItem({ ignoreMatchThreshold: true, replaceDestination: true });
  }, [importQueueItem]);

  const handleCompareRemovePress = useCallback(() => {
    setIsImportDestinationsModalOpen(false);
    setIsRemoveQueueItemModalOpen(true);
  }, []);

  const chips = getQueueStatusChips(props);
  const canRetry = canRetryImport(props);
  const hasCloseMatch = canRetry && chips.some((c) => c.key === CLOSE_MATCH);
  const hasDestinationExists =
    canRetry && chips.some((c) => c.key === DESTINATION_EXISTS);

  const progress = 100 - (sizeleft / size) * 100;
  const showInteractiveImport =
    status === 'completed' && trackedDownloadStatus === 'warning';
  const isPending =
    status === 'delay' || status === 'downloadClientUnavailable';

  return (
    <TableRow>
      <TableSelectCell
        id={id}
        isSelected={isSelected}
        onSelectedChange={onSelectedChange}
      />

      {columns.map((column) => {
        const { name, isVisible } = column;

        if (!isVisible) {
          return null;
        }

        if (name === 'status') {
          return (
            <QueueStatusCell
              key={name}
              sourceTitle={title}
              status={status}
              trackedDownloadStatus={trackedDownloadStatus}
              trackedDownloadState={trackedDownloadState}
              statusMessages={statusMessages}
              errorMessage={errorMessage}
              chips={chips}
              actionError={getImportErrorMessage(importError)}
            >
              {hasCloseMatch ? (
                <SpinnerButton
                  size={sizes.SMALL}
                  kind={kinds.PRIMARY}
                  title={translate('ImportAnywayHelpText')}
                  isSpinning={isImporting}
                  onPress={handleImportAnywayPress}
                >
                  {translate('ImportAnyway')}
                </SpinnerButton>
              ) : null}

              {hasCloseMatch ? (
                <Button
                  size={sizes.SMALL}
                  kind={kinds.WARNING}
                  title={translate('BlocklistAndSearchHelpText')}
                  isDisabled={isRemoving}
                  onPress={handleBlocklistAndSearchPress}
                >
                  {translate('BlocklistAndSearch')}
                </Button>
              ) : null}

              {hasDestinationExists ? (
                <SpinnerButton
                  size={sizes.SMALL}
                  kind={kinds.DANGER}
                  title={translate('CompareHelpText')}
                  isSpinning={isImporting}
                  onPress={handleComparePress}
                >
                  {translate('Compare')}
                </SpinnerButton>
              ) : null}
            </QueueStatusCell>
          );
        }

        if (name === 'authorMetadata.sortName') {
          return (
            <TableRowCell key={name}>
              {author ? (
                <AuthorNameLink
                  titleSlug={author.titleSlug}
                  authorName={author.authorName}
                />
              ) : (
                <span className={styles.unmatchedTitle}>{title}</span>
              )}
            </TableRowCell>
          );
        }

        if (name === 'books.title') {
          return (
            <TableRowCell key={name}>
              {book ? (
                <BookTitleLink
                  titleSlug={book.titleSlug}
                  title={book.title}
                  disambiguation={book.disambiguation}
                />
              ) : (
                '-'
              )}
            </TableRowCell>
          );
        }

        if (name === 'books.releaseDate') {
          if (book) {
            return (
              <RelativeDateCellConnector key={name} date={book.releaseDate} />
            );
          }

          return <TableRowCell key={name}>-</TableRowCell>;
        }

        if (name === 'quality') {
          return (
            <TableRowCell key={name}>
              {quality ? <BookQuality quality={quality} /> : null}
            </TableRowCell>
          );
        }

        if (name === 'customFormats') {
          return (
            <TableRowCell key={name}>
              <BookFormats formats={customFormats} />
            </TableRowCell>
          );
        }

        if (name === 'customFormatScore') {
          return (
            <TableRowCell key={name} className={styles.customFormatScore}>
              <Tooltip
                anchor={formatCustomFormatScore(
                  customFormatScore,
                  customFormats.length
                )}
                tooltip={<BookFormats formats={customFormats} />}
                position={tooltipPositions.BOTTOM}
              />
            </TableRowCell>
          );
        }

        if (name === 'protocol') {
          return (
            <TableRowCell key={name}>
              <ProtocolLabel protocol={protocol} />
            </TableRowCell>
          );
        }

        if (name === 'indexer') {
          return <TableRowCell key={name}>{indexer}</TableRowCell>;
        }

        if (name === 'downloadClient') {
          return <TableRowCell key={name}>{downloadClient}</TableRowCell>;
        }

        if (name === 'title') {
          return <TableRowCell key={name}>{title}</TableRowCell>;
        }

        if (name === 'size') {
          return <TableRowCell key={name}>{formatBytes(size)}</TableRowCell>;
        }

        if (name === 'outputPath') {
          return <TableRowCell key={name}>{outputPath}</TableRowCell>;
        }

        if (name === 'estimatedCompletionTime') {
          return (
            <TimeLeftCell
              key={name}
              status={status}
              estimatedCompletionTime={estimatedCompletionTime}
              timeLeft={timeleft}
              size={size}
              sizeLeft={sizeleft}
              showRelativeDates={showRelativeDates}
              shortDateFormat={shortDateFormat}
              timeFormat={timeFormat}
            />
          );
        }

        if (name === 'progress') {
          return (
            <TableRowCell key={name} className={styles.progress}>
              {progress ? (
                <ProgressBar
                  progress={progress}
                  title={`${progress.toFixed(1)}%`}
                />
              ) : null}
            </TableRowCell>
          );
        }

        if (name === 'actions') {
          return (
            <TableRowCell key={name} className={styles.actions}>
              {downloadForced ? (
                <Popover
                  anchor={<Icon name={icons.DANGER} kind={kinds.DANGER} />}
                  title={translate('ManualDownload')}
                  body={translate('ManualDownloadImportWarning')}
                  position={tooltipPositions.LEFT}
                />
              ) : null}

              {showInteractiveImport ? (
                <IconButton
                  name={icons.INTERACTIVE}
                  title={translate('InteractiveImport')}
                  onPress={handleInteractiveImportPress}
                />
              ) : null}

              {isPending ? (
                <SpinnerIconButton
                  name={icons.DOWNLOAD}
                  kind={grabError ? kinds.DANGER : kinds.DEFAULT}
                  title={translate('Grab')}
                  isSpinning={isGrabbing}
                  onPress={handleGrabPress}
                />
              ) : null}

              <SpinnerIconButton
                title={translate('RemoveFromQueue')}
                name={icons.REMOVE}
                isSpinning={isRemoving}
                onPress={handleRemoveQueueItemPress}
              />
            </TableRowCell>
          );
        }

        return null;
      })}

      <InteractiveImportModal
        isOpen={isInteractiveImportModalOpen}
        downloadId={downloadId}
        title={title}
        showReplaceExistingFiles={true}
        replaceExistingFiles={true}
        onModalClose={handleInteractiveImportModalClose}
      />

      <ConfirmModal
        isOpen={isBlocklistAndSearchModalOpen}
        kind={kinds.WARNING}
        title={translate('BlocklistAndSearch')}
        message={translate('BlocklistAndSearchMessage', { title })}
        confirmLabel={translate('BlocklistAndSearch')}
        onConfirm={handleBlocklistAndSearchConfirmed}
        onCancel={handleBlocklistAndSearchModalClose}
      />

      <ImportDestinationsModal
        isOpen={isImportDestinationsModalOpen}
        id={id}
        title={title}
        shortDateFormat={shortDateFormat}
        timeFormat={timeFormat}
        isImporting={isImporting}
        importError={importError}
        onImportAndReplacePress={handleImportAndReplacePress}
        onRemovePress={handleCompareRemovePress}
        onModalClose={handleImportDestinationsModalClose}
      />

      <RemoveQueueItemModal
        isOpen={isRemoveQueueItemModalOpen}
        sourceTitle={title}
        canChangeCategory={!!downloadClientHasPostImportCategory}
        canIgnore={!!author}
        isPending={isPending}
        onRemovePress={handleRemoveQueueItemModalConfirmed}
        onModalClose={handleRemoveQueueItemModalClose}
      />
    </TableRow>
  );
}

export default QueueRow;
