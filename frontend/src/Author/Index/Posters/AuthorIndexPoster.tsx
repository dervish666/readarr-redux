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
import translate from 'Utilities/String/translate';
import { useAuthorIndexPosterOptions } from '../authorIndexOptionsStore';
import useAuthorIndexItem from '../useAuthorIndexItem';
import AuthorIndexPosterInfo from './AuthorIndexPosterInfo';
import styles from './AuthorIndexPoster.css';

interface AuthorIndexPosterProps {
  authorId: number;
  sortKey: string;
  posterWidth: number;
  posterHeight: number;
}

function AuthorIndexPoster(props: AuthorIndexPosterProps) {
  const { authorId, sortKey, posterWidth, posterHeight } = props;

  const {
    author,
    qualityProfile,
    metadataProfile,
    isRefreshingAuthor,
    isSearchingAuthor,
  } = useAuthorIndexItem(authorId);

  const {
    detailedProgressBar,
    showTitle,
    showMonitored,
    showQualityProfile,
    showSearchAction,
  } = useAuthorIndexPosterOptions();

  const { isSelectMode } = useAuthorIndexSelect();
  const executeCommand = useExecuteCommand();
  const [hasPosterError, setHasPosterError] = useState(false);
  const [isEditAuthorModalOpen, setIsEditAuthorModalOpen] = useState(false);
  const [isDeleteAuthorModalOpen, setIsDeleteAuthorModalOpen] = useState(false);

  const handleRefreshPress = useCallback(() => {
    executeCommand({ name: commandNames.REFRESH_AUTHOR, authorId });
  }, [authorId, executeCommand]);

  const handleSearchPress = useCallback(() => {
    executeCommand({ name: commandNames.AUTHOR_SEARCH, authorId });
  }, [authorId, executeCommand]);

  const handlePosterLoadError = useCallback(() => {
    setHasPosterError(true);
  }, []);

  const handlePosterLoad = useCallback(() => {
    setHasPosterError(false);
  }, []);

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

  const name = showTitle === 'firstLast' ? authorName : authorNameLastFirst;
  const link = `/author/${titleSlug}`;

  const elementStyle = {
    width: `${posterWidth}px`,
    height: `${posterHeight}px`,
    objectFit: 'contain' as const,
  };

  const hasQualityProfile = showQualityProfile && !!qualityProfile?.name;

  return (
    <div className={styles.content}>
      <div className={styles.posterContainer} title={authorName}>
        {isSelectMode ? (
          <AuthorIndexPosterSelect authorId={authorId} titleSlug={titleSlug} />
        ) : null}

        <div className={styles.controls}>
          <SpinnerIconButton
            className={styles.action}
            name={icons.REFRESH}
            title={translate('RefreshAuthor')}
            isSpinning={isRefreshingAuthor}
            tabIndex={-1}
            onPress={handleRefreshPress}
          />

          {showSearchAction ? (
            <SpinnerIconButton
              className={styles.action}
              name={icons.SEARCH}
              title={translate('SearchForMonitoredBooks')}
              isSpinning={isSearchingAuthor}
              tabIndex={-1}
              onPress={handleSearchPress}
            />
          ) : null}

          <IconButton
            className={styles.action}
            name={icons.EDIT}
            title={translate('EditAuthor')}
            aria-label={translate('EditAuthor')}
            tabIndex={-1}
            onPress={handleEditAuthorPress}
          />
        </div>

        {status === 'ended' ? (
          <div
            className={classNames(styles.status, styles.ended)}
            title={translate('Ended')}
          >
            <span className={styles.statusLabel}>{translate('Ended')}</span>
          </div>
        ) : null}

        <Link className={styles.link} style={elementStyle} to={link}>
          <AuthorPoster
            style={elementStyle}
            images={images}
            size={250}
            lazy={false}
            overflow={true}
            blurBackground={true}
            onError={handlePosterLoadError}
            onLoad={handlePosterLoad}
          />

          {hasPosterError ? (
            <div className={styles.overlayTitle}>{authorName}</div>
          ) : null}
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
        detailedProgressBar={detailedProgressBar}
      />

      {showTitle === 'no' ? null : (
        <div className={styles.title} title={name}>
          {name}
        </div>
      )}

      {showMonitored || hasQualityProfile ? (
        <div className={styles.meta}>
          {showMonitored
            ? translate(monitored ? 'Monitored' : 'Unmonitored')
            : null}

          {showMonitored && hasQualityProfile ? (
            <span className={styles.metaSep}> · </span>
          ) : null}

          {hasQualityProfile ? qualityProfile.name : null}
        </div>
      ) : null}

      <AuthorIndexPosterInfo
        author={author}
        qualityProfile={qualityProfile}
        metadataProfile={metadataProfile}
        showQualityProfile={showQualityProfile}
        sortKey={sortKey}
      />

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

export default AuthorIndexPoster;
