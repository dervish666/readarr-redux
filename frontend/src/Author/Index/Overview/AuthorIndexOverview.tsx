import classNames from 'classnames';
import React, { useCallback, useState } from 'react';
import AuthorPoster from 'Author/AuthorPoster';
import DeleteAuthorModal from 'Author/Delete/DeleteAuthorModal';
import EditAuthorModalConnector from 'Author/Edit/EditAuthorModalConnector';
import AuthorIndexProgressBar from 'Author/Index/ProgressBar/AuthorIndexProgressBar';
import AuthorIndexPosterSelect from 'Author/Index/Select/AuthorIndexPosterSelect';
import { useAuthorIndexSelect } from 'Author/Index/Select/AuthorIndexSelectContext';
import * as commandNames from 'Commands/commandNames';
import { useExecuteCommand } from 'Commands/useCommands';
import IconButton from 'Components/Link/IconButton';
import Link from 'Components/Link/Link';
import SpinnerIconButton from 'Components/Link/SpinnerIconButton';
import { icons } from 'Helpers/Props';
import stripHtml from 'Utilities/String/stripHtml';
import translate from 'Utilities/String/translate';
import { useAuthorIndexOverviewOptions } from '../authorIndexOptionsStore';
import useAuthorIndexItem from '../useAuthorIndexItem';
import AuthorIndexOverviewInfo from './AuthorIndexOverviewInfo';
import { ROW_BORDER, ROW_VERTICAL_PADDING } from './overviewLayout';
import styles from './AuthorIndexOverview.css';

// Mirrors .synopsis font-size/line-height in AuthorIndexOverview.css.
const SYNOPSIS_FONT_SIZE = 13.5;
const SYNOPSIS_LINE_HEIGHT = 1.6;

const TITLE_HEIGHT = 38;
const CHIP_STRIP_HEIGHT = 28;

interface AuthorIndexOverviewProps {
  authorId: number;
  sortKey: string;
  posterWidth: number;
  posterHeight: number;
  rowHeight: number;
}

function AuthorIndexOverview(props: AuthorIndexOverviewProps) {
  const { authorId, sortKey, posterWidth, posterHeight, rowHeight } = props;

  const { author, qualityProfile, isRefreshingAuthor, isSearchingAuthor } =
    useAuthorIndexItem(authorId);

  const overviewOptions = useAuthorIndexOverviewOptions();
  const { isSelectMode } = useAuthorIndexSelect();
  const executeCommand = useExecuteCommand();
  const [isEditAuthorModalOpen, setIsEditAuthorModalOpen] = useState(false);
  const [isDeleteAuthorModalOpen, setIsDeleteAuthorModalOpen] = useState(false);

  const handleRefreshPress = useCallback(() => {
    executeCommand({ name: commandNames.REFRESH_AUTHOR, authorId });
  }, [authorId, executeCommand]);

  const handleSearchPress = useCallback(() => {
    executeCommand({ name: commandNames.AUTHOR_SEARCH, authorId });
  }, [authorId, executeCommand]);

  const handleEditAuthorPress = useCallback(() => {
    setIsEditAuthorModalOpen(true);
  }, []);

  const handleEditAuthorModalClose = useCallback(() => {
    setIsEditAuthorModalOpen(false);
  }, []);

  const handleDeleteAuthorPress = useCallback(() => {
    setIsEditAuthorModalOpen(false);
    setIsDeleteAuthorModalOpen(true);
  }, []);

  const handleDeleteAuthorModalClose = useCallback(() => {
    setIsDeleteAuthorModalOpen(false);
  }, []);

  if (!author) {
    return null;
  }

  const {
    authorName,
    authorNameLastFirst,
    overview,
    monitored,
    status,
    titleSlug,
    images,
    statistics,
  } = author;

  const {
    bookCount = 0,
    availableBookCount = 0,
    bookFileCount = 0,
    totalBookCount = 0,
  } = statistics ?? {};

  const link = `/author/${titleSlug}`;

  const elementStyle = {
    width: `${posterWidth}px`,
    height: `${posterHeight}px`,
    objectFit: 'contain' as const,
  };

  const contentHeight = rowHeight - (ROW_VERTICAL_PADDING * 2 + ROW_BORDER);

  const synopsisLines = Math.max(
    1,
    Math.floor(
      (contentHeight - TITLE_HEIGHT - CHIP_STRIP_HEIGHT) /
        (SYNOPSIS_FONT_SIZE * SYNOPSIS_LINE_HEIGHT)
    )
  );

  const statusLabel = translate(status === 'ended' ? 'Ended' : 'Continuing');

  return (
    <div>
      <div className={styles.content}>
        <div className={styles.poster}>
          <div className={styles.posterContainer}>
            {isSelectMode ? (
              <AuthorIndexPosterSelect
                authorId={authorId}
                titleSlug={titleSlug}
              />
            ) : null}

            <div className={classNames(styles.statusPill, styles[status])}>
              <span className={styles.statusLabel}>{statusLabel}</span>
            </div>

            <Link className={styles.link} style={elementStyle} to={link}>
              <AuthorPoster
                style={elementStyle}
                images={images}
                size={250}
                lazy={false}
                overflow={true}
                blurBackground={true}
              />
            </Link>
          </div>

          <AuthorIndexProgressBar
            monitored={monitored}
            status={status}
            bookCount={bookCount}
            availableBookCount={availableBookCount}
            bookFileCount={bookFileCount}
            totalBookCount={totalBookCount}
            width={posterWidth}
            detailedProgressBar={overviewOptions.detailedProgressBar}
          />
        </div>

        <div className={styles.info} style={{ maxHeight: contentHeight }}>
          <div className={styles.titleRow}>
            <Link className={styles.title} to={link}>
              {overviewOptions.showTitle === 'firstLast'
                ? authorName
                : authorNameLastFirst}
            </Link>

            <div className={styles.actions}>
              <SpinnerIconButton
                className={styles.action}
                name={icons.REFRESH}
                title={translate('RefreshAuthor')}
                isSpinning={isRefreshingAuthor}
                onPress={handleRefreshPress}
              />

              {overviewOptions.showSearchAction ? (
                <SpinnerIconButton
                  className={styles.action}
                  name={icons.SEARCH}
                  title={translate('SearchForMonitoredBooks')}
                  isSpinning={isSearchingAuthor}
                  onPress={handleSearchPress}
                />
              ) : null}

              <IconButton
                className={styles.action}
                name={icons.EDIT}
                title={translate('EditAuthor')}
                aria-label={translate('EditAuthor')}
                onPress={handleEditAuthorPress}
              />
            </div>
          </div>

          <Link
            className={styles.synopsis}
            to={link}
            style={{ WebkitLineClamp: synopsisLines }}
          >
            {stripHtml(overview ?? '')}
          </Link>

          <AuthorIndexOverviewInfo
            author={author}
            qualityProfile={qualityProfile}
            overviewOptions={overviewOptions}
            sortKey={sortKey}
          />
        </div>
      </div>

      <EditAuthorModalConnector
        isOpen={isEditAuthorModalOpen}
        authorId={authorId}
        onModalClose={handleEditAuthorModalClose}
        onDeleteAuthorPress={handleDeleteAuthorPress}
      />

      <DeleteAuthorModal
        isOpen={isDeleteAuthorModalOpen}
        authorId={authorId}
        onModalClose={handleDeleteAuthorModalClose}
      />
    </div>
  );
}

export default AuthorIndexOverview;
