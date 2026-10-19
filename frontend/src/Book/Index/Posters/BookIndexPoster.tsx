import React, { useCallback, useState } from 'react';
import AuthorPoster from 'Author/AuthorPoster';
import DeleteAuthorModal from 'Author/Delete/DeleteAuthorModal';
import EditAuthorModal from 'Author/Edit/EditAuthorModal';
import Book from 'Book/Book';
import EditBookModal from 'Book/Edit/EditBookModal';
import * as commandNames from 'Commands/commandNames';
import { useExecuteCommand } from 'Commands/useCommands';
import IconButton from 'Components/Link/IconButton';
import Link from 'Components/Link/Link';
import SpinnerIconButton from 'Components/Link/SpinnerIconButton';
import { icons } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import { useBookIndexPosterOptions } from '../bookIndexOptionsStore';
import BookIndexProgressBar from '../ProgressBar/BookIndexProgressBar';
import BookIndexPosterSelect from '../Select/BookIndexPosterSelect';
import { useBookIndexSelect } from '../Select/BookIndexSelectContext';
import useBookIndexItem from '../useBookIndexItem';
import BookIndexPosterInfo from './BookIndexPosterInfo';
import styles from './BookIndexPoster.css';

interface BookIndexPosterProps {
  book: Book;
  sortKey: string;
  posterWidth: number;
  posterHeight: number;
}

function BookIndexPoster(props: BookIndexPosterProps) {
  const { book, sortKey, posterWidth, posterHeight } = props;

  const { author, qualityProfile, isRefreshingBook, isSearchingBook } =
    useBookIndexItem(book);

  const {
    detailedProgressBar,
    showTitle,
    showAuthor,
    showMonitored,
    showQualityProfile,
    showSearchAction,
  } = useBookIndexPosterOptions();

  const { isSelectMode } = useBookIndexSelect();
  const executeCommand = useExecuteCommand();
  const [hasPosterError, setHasPosterError] = useState(false);
  const [isEditAuthorModalOpen, setIsEditAuthorModalOpen] = useState(false);
  const [isDeleteAuthorModalOpen, setIsDeleteAuthorModalOpen] = useState(false);
  const [isEditBookModalOpen, setIsEditBookModalOpen] = useState(false);

  const { id: bookId, authorId, title, monitored, titleSlug, images } = book;

  const handleRefreshPress = useCallback(() => {
    executeCommand({ name: commandNames.REFRESH_BOOK, bookId });
  }, [bookId, executeCommand]);

  const handleSearchPress = useCallback(() => {
    executeCommand({ name: commandNames.BOOK_SEARCH, bookIds: [bookId] });
  }, [bookId, executeCommand]);

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

  const handleEditBookPress = useCallback(() => {
    setIsEditBookModalOpen(true);
  }, []);

  const handleEditBookModalClose = useCallback(() => {
    setIsEditBookModalOpen(false);
  }, []);

  const {
    bookCount = 0,
    bookFileCount = 0,
    totalBookCount = 0,
  } = book.statistics ?? {};

  const elementStyle = {
    width: `${posterWidth}px`,
    height: `${posterHeight}px`,
    objectFit: 'contain' as const,
  };

  const hasQualityProfile = showQualityProfile && !!qualityProfile?.name;

  return (
    <div className={styles.content}>
      <div className={styles.posterContainer} title={title}>
        {isSelectMode ? (
          <BookIndexPosterSelect bookId={bookId} titleSlug={titleSlug} />
        ) : null}

        <div className={styles.controls}>
          <SpinnerIconButton
            className={styles.action}
            name={icons.REFRESH}
            title={translate('RefreshBook')}
            isSpinning={isRefreshingBook}
            tabIndex={-1}
            onPress={handleRefreshPress}
          />

          {showSearchAction ? (
            <SpinnerIconButton
              className={styles.action}
              name={icons.SEARCH}
              title={translate('SearchForMonitoredBooks')}
              isSpinning={isSearchingBook}
              tabIndex={-1}
              onPress={handleSearchPress}
            />
          ) : null}

          <IconButton
            className={styles.action}
            name={icons.INTERACTIVE}
            title={translate('EditAuthor')}
            aria-label={translate('EditAuthor')}
            tabIndex={-1}
            onPress={handleEditAuthorPress}
          />

          <IconButton
            className={styles.action}
            name={icons.EDIT}
            title={translate('EditBook')}
            aria-label={translate('EditBook')}
            tabIndex={-1}
            onPress={handleEditBookPress}
          />
        </div>

        <Link
          className={styles.link}
          style={elementStyle}
          to={`/book/${titleSlug}`}
        >
          <AuthorPoster
            style={elementStyle}
            images={images}
            coverType="cover"
            size={250}
            lazy={false}
            overflow={true}
            blurBackground={true}
            onError={handlePosterLoadError}
            onLoad={handlePosterLoad}
          />

          {hasPosterError ? (
            <div className={styles.overlayTitle}>{title}</div>
          ) : null}
        </Link>
      </div>

      <BookIndexProgressBar
        monitored={monitored}
        bookCount={bookCount}
        bookFileCount={bookFileCount}
        totalBookCount={totalBookCount}
        width={posterWidth}
        detailedProgressBar={detailedProgressBar}
      />

      {showTitle ? (
        <div className={styles.title} title={title}>
          {title}
        </div>
      ) : null}

      {showAuthor && author ? (
        <div className={styles.author} title={author.authorName}>
          {author.authorName}
        </div>
      ) : null}

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

      <BookIndexPosterInfo
        book={book}
        author={author}
        qualityProfile={qualityProfile}
        showQualityProfile={showQualityProfile}
        sortKey={sortKey}
      />

      <EditAuthorModal
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

      <EditBookModal
        isOpen={isEditBookModalOpen}
        bookId={bookId}
        onModalClose={handleEditBookModalClose}
      />
    </div>
  );
}

export default BookIndexPoster;
