import PropTypes from 'prop-types';
import React, { Component } from 'react';
import ProtocolLabel from 'Activity/Queue/ProtocolLabel';
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
import TableRow from 'Components/Table/TableRow';
import Popover from 'Components/Tooltip/Popover';
import Tooltip from 'Components/Tooltip/Tooltip';
import { icons, kinds, sizes, tooltipPositions } from 'Helpers/Props';
import InteractiveImportModal from 'InteractiveImport/InteractiveImportModal';
import formatBytes from 'Utilities/Number/formatBytes';
import formatCustomFormatScore from 'Utilities/Number/formatCustomFormatScore';
import getErrorMessage from 'Utilities/Object/getErrorMessage';
import translate from 'Utilities/String/translate';
import getQueueStatusChips, { canRetryImport, CLOSE_MATCH, DESTINATION_EXISTS } from './getQueueStatusChips';
import ImportDestinationsModal from './ImportDestinations/ImportDestinationsModal';
import QueueStatusCell from './QueueStatusCell';
import RemoveQueueItemModal from './RemoveQueueItemModal';
import TimeleftCell from './TimeleftCell';
import styles from './QueueRow.css';

class QueueRow extends Component {

  //
  // Lifecycle

  constructor(props, context) {
    super(props, context);

    this.state = {
      isRemoveQueueItemModalOpen: false,
      isInteractiveImportModalOpen: false,
      isBlocklistAndSearchModalOpen: false,
      isImportDestinationsModalOpen: false
    };
  }

  //
  // Listeners

  onRemoveQueueItemPress = () => {
    this.setState({ isRemoveQueueItemModalOpen: true });
  };

  onRemoveQueueItemModalConfirmed = (blocklist, skipRedownload) => {
    const {
      onRemoveQueueItemPress,
      onQueueRowModalOpenOrClose
    } = this.props;

    onQueueRowModalOpenOrClose(false);
    onRemoveQueueItemPress(blocklist, skipRedownload);

    this.setState({ isRemoveQueueItemModalOpen: false });
  };

  onRemoveQueueItemModalClose = () => {
    this.props.onQueueRowModalOpenOrClose(false);

    this.setState({ isRemoveQueueItemModalOpen: false });
  };

  onInteractiveImportPress = () => {
    this.props.onQueueRowModalOpenOrClose(true);

    this.setState({ isInteractiveImportModalOpen: true });
  };

  onInteractiveImportModalClose = () => {
    this.props.onQueueRowModalOpenOrClose(false);

    this.setState({ isInteractiveImportModalOpen: false });
  };

  onImportAnywayPress = () => {
    this.props.onImportQueueItemPress({ ignoreMatchThreshold: true });
  };

  onBlocklistAndSearchPress = () => {
    this.props.onQueueRowModalOpenOrClose(true);

    this.setState({ isBlocklistAndSearchModalOpen: true });
  };

  onBlocklistAndSearchConfirmed = () => {
    this.props.onQueueRowModalOpenOrClose(false);
    this.props.onRemoveQueueItemPress({ remove: true, changeCategory: false, blocklist: true, skipRedownload: false });

    this.setState({ isBlocklistAndSearchModalOpen: false });
  };

  onBlocklistAndSearchModalClose = () => {
    this.props.onQueueRowModalOpenOrClose(false);

    this.setState({ isBlocklistAndSearchModalOpen: false });
  };

  onComparePress = () => {
    this.props.onQueueRowModalOpenOrClose(true);

    this.setState({ isImportDestinationsModalOpen: true });
  };

  onImportDestinationsModalClose = () => {
    this.props.onQueueRowModalOpenOrClose(false);

    this.setState({ isImportDestinationsModalOpen: false });
  };

  onImportAndReplacePress = () => {
    // The user has seen which book the files go to, so the match threshold doesn't hold them back either
    this.props.onImportQueueItemPress({ ignoreMatchThreshold: true, replaceDestination: true });
  };

  onCompareRemovePress = () => {
    this.setState({
      isImportDestinationsModalOpen: false,
      isRemoveQueueItemModalOpen: true
    });
  };

  //
  // Render

  render() {
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
      customFormats,
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
      showRelativeDates,
      shortDateFormat,
      timeFormat,
      isGrabbing,
      grabError,
      isImporting,
      importError,
      isRemoving,
      isSelected,
      columns,
      onSelectedChange,
      onGrabPress
    } = this.props;

    const {
      isRemoveQueueItemModalOpen,
      isInteractiveImportModalOpen,
      isBlocklistAndSearchModalOpen,
      isImportDestinationsModalOpen
    } = this.state;

    const chips = getQueueStatusChips(this.props);
    const canRetry = canRetryImport(this.props);
    const hasCloseMatch = canRetry && chips.some((c) => c.key === CLOSE_MATCH);
    const hasDestinationExists = canRetry && chips.some((c) => c.key === DESTINATION_EXISTS);

    const progress = 100 - (sizeleft / size * 100);
    const showInteractiveImport = status === 'completed' && trackedDownloadStatus === 'warning';
    const isPending = status === 'delay' || status === 'downloadClientUnavailable';

    return (
      <TableRow>
        <TableSelectCell
          id={id}
          isSelected={isSelected}
          onSelectedChange={onSelectedChange}
        />

        {
          columns.map((column) => {
            const {
              name,
              isVisible
            } = column;

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
                  actionError={importError ? getErrorMessage(importError, translate('QueueImportFailed')) : null}
                >
                  {
                    hasCloseMatch &&
                      <SpinnerButton
                        size={sizes.SMALL}
                        kind={kinds.PRIMARY}
                        title={translate('ImportAnywayHelpText')}
                        isSpinning={isImporting}
                        onPress={this.onImportAnywayPress}
                      >
                        {translate('ImportAnyway')}
                      </SpinnerButton>
                  }

                  {
                    hasCloseMatch &&
                      <Button
                        size={sizes.SMALL}
                        kind={kinds.WARNING}
                        title={translate('BlocklistAndSearchHelpText')}
                        isDisabled={isRemoving}
                        onPress={this.onBlocklistAndSearchPress}
                      >
                        {translate('BlocklistAndSearch')}
                      </Button>
                  }

                  {
                    hasDestinationExists &&
                      <SpinnerButton
                        size={sizes.SMALL}
                        kind={kinds.DANGER}
                        title={translate('CompareHelpText')}
                        isSpinning={isImporting}
                        onPress={this.onComparePress}
                      >
                        {translate('Compare')}
                      </SpinnerButton>
                  }
                </QueueStatusCell>
              );
            }

            if (name === 'authorMetadata.sortName') {
              return (
                <TableRowCell key={name}>
                  {
                    author ?
                      <AuthorNameLink
                        titleSlug={author.titleSlug}
                        authorName={author.authorName}
                      /> :
                      title
                  }
                </TableRowCell>
              );
            }

            if (name === 'books.title') {
              return (
                <TableRowCell key={name}>
                  {
                    book ?
                      <BookTitleLink
                        titleSlug={book.titleSlug}
                        title={book.title}
                        disambiguation={book.disambiguation}
                      /> :
                      '-'
                  }
                </TableRowCell>
              );
            }

            if (name === 'books.releaseDate') {
              if (book) {
                return (
                  <RelativeDateCellConnector
                    key={name}
                    date={book.releaseDate}
                  />
                );
              }

              return (
                <TableRowCell key={name}>
                  -
                </TableRowCell>
              );
            }

            if (name === 'quality') {
              return (
                <TableRowCell key={name}>
                  <BookQuality
                    quality={quality}
                  />
                </TableRowCell>
              );
            }

            if (name === 'customFormats') {
              return (
                <TableRowCell key={name}>
                  <BookFormats
                    formats={customFormats}
                  />
                </TableRowCell>
              );
            }

            if (name === 'customFormatScore') {
              return (
                <TableRowCell
                  key={name}
                  className={styles.customFormatScore}
                >
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
                  <ProtocolLabel
                    protocol={protocol}
                  />
                </TableRowCell>
              );
            }

            if (name === 'indexer') {
              return (
                <TableRowCell key={name}>
                  {indexer}
                </TableRowCell>
              );
            }

            if (name === 'downloadClient') {
              return (
                <TableRowCell key={name}>
                  {downloadClient}
                </TableRowCell>
              );
            }

            if (name === 'title') {
              return (
                <TableRowCell key={name}>
                  {title}
                </TableRowCell>
              );
            }

            if (name === 'size') {
              return (
                <TableRowCell key={name}>{formatBytes(size)}</TableRowCell>
              );
            }

            if (name === 'outputPath') {
              return (
                <TableRowCell key={name}>
                  {outputPath}
                </TableRowCell>
              );
            }

            if (name === 'estimatedCompletionTime') {
              return (
                <TimeleftCell
                  key={name}
                  status={status}
                  estimatedCompletionTime={estimatedCompletionTime}
                  timeleft={timeleft}
                  size={size}
                  sizeleft={sizeleft}
                  showRelativeDates={showRelativeDates}
                  shortDateFormat={shortDateFormat}
                  timeFormat={timeFormat}
                />
              );
            }

            if (name === 'progress') {
              return (
                <TableRowCell
                  key={name}
                  className={styles.progress}
                >
                  {
                    !!progress &&
                      <ProgressBar
                        progress={progress}
                        title={`${progress.toFixed(1)}%`}
                      />
                  }
                </TableRowCell>
              );
            }

            if (name === 'actions') {
              return (
                <TableRowCell
                  key={name}
                  className={styles.actions}
                >
                  {
                    downloadForced &&
                      <Popover
                        anchor={
                          <Icon
                            name={icons.DANGER}
                            kind={kinds.DANGER}
                          />
                        }
                        title={translate('ManualDownload')}
                        body="This release failed parsing checks and was manually downloaded from an interactive search.  Import is likely to fail."
                        position={tooltipPositions.LEFT}
                      />
                  }

                  {
                    showInteractiveImport &&
                      <IconButton
                        name={icons.INTERACTIVE}
                        onPress={this.onInteractiveImportPress}
                      />
                  }

                  {
                    isPending &&
                      <SpinnerIconButton
                        name={icons.DOWNLOAD}
                        kind={grabError ? kinds.DANGER : kinds.DEFAULT}
                        isSpinning={isGrabbing}
                        onPress={onGrabPress}
                      />
                  }

                  <SpinnerIconButton
                    title={translate('RemoveFromQueue')}
                    name={icons.REMOVE}
                    isSpinning={isRemoving}
                    onPress={this.onRemoveQueueItemPress}
                  />
                </TableRowCell>
              );
            }

            return null;
          })
        }

        <InteractiveImportModal
          isOpen={isInteractiveImportModalOpen}
          downloadId={downloadId}
          title={title}
          onModalClose={this.onInteractiveImportModalClose}
          showReplaceExistingFiles={true}
          replaceExistingFiles={true}
        />

        <ConfirmModal
          isOpen={isBlocklistAndSearchModalOpen}
          kind={kinds.WARNING}
          title={translate('BlocklistAndSearch')}
          message={translate('BlocklistAndSearchMessage', { title })}
          confirmLabel={translate('BlocklistAndSearch')}
          onConfirm={this.onBlocklistAndSearchConfirmed}
          onCancel={this.onBlocklistAndSearchModalClose}
        />

        <ImportDestinationsModal
          isOpen={isImportDestinationsModalOpen}
          id={id}
          title={title}
          shortDateFormat={shortDateFormat}
          timeFormat={timeFormat}
          isImporting={isImporting}
          importError={importError}
          onImportAndReplacePress={this.onImportAndReplacePress}
          onRemovePress={this.onCompareRemovePress}
          onModalClose={this.onImportDestinationsModalClose}
        />

        <RemoveQueueItemModal
          isOpen={isRemoveQueueItemModalOpen}
          sourceTitle={title}
          canChangeCategory={!!downloadClientHasPostImportCategory}
          canIgnore={!!author}
          isPending={isPending}
          onRemovePress={this.onRemoveQueueItemModalConfirmed}
          onModalClose={this.onRemoveQueueItemModalClose}
        />
      </TableRow>
    );
  }

}

QueueRow.propTypes = {
  id: PropTypes.number.isRequired,
  downloadId: PropTypes.string,
  title: PropTypes.string.isRequired,
  status: PropTypes.string.isRequired,
  trackedDownloadStatus: PropTypes.string,
  trackedDownloadState: PropTypes.string,
  statusMessages: PropTypes.arrayOf(PropTypes.object),
  errorMessage: PropTypes.string,
  author: PropTypes.object,
  book: PropTypes.object,
  quality: PropTypes.object.isRequired,
  customFormats: PropTypes.arrayOf(PropTypes.object),
  customFormatScore: PropTypes.number.isRequired,
  protocol: PropTypes.string.isRequired,
  indexer: PropTypes.string,
  outputPath: PropTypes.string,
  downloadClient: PropTypes.string,
  downloadClientHasPostImportCategory: PropTypes.bool,
  downloadForced: PropTypes.bool.isRequired,
  estimatedCompletionTime: PropTypes.string,
  timeleft: PropTypes.string,
  size: PropTypes.number,
  sizeleft: PropTypes.number,
  showRelativeDates: PropTypes.bool.isRequired,
  shortDateFormat: PropTypes.string.isRequired,
  timeFormat: PropTypes.string.isRequired,
  isGrabbing: PropTypes.bool.isRequired,
  grabError: PropTypes.object,
  isImporting: PropTypes.bool.isRequired,
  importError: PropTypes.object,
  isRemoving: PropTypes.bool.isRequired,
  isSelected: PropTypes.bool,
  columns: PropTypes.arrayOf(PropTypes.object).isRequired,
  onSelectedChange: PropTypes.func.isRequired,
  onGrabPress: PropTypes.func.isRequired,
  onImportQueueItemPress: PropTypes.func.isRequired,
  onRemoveQueueItemPress: PropTypes.func.isRequired,
  onQueueRowModalOpenOrClose: PropTypes.func.isRequired
};

QueueRow.defaultProps = {
  customFormats: [],
  isGrabbing: false,
  isImporting: false,
  isRemoving: false
};

export default QueueRow;
