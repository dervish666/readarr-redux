import React, { useCallback, useState } from 'react';
import AuthorPoster from 'Author/AuthorPoster';
import DeleteAuthorModal from 'Author/Delete/DeleteAuthorModal';
import EditAuthorModal from 'Author/Edit/EditAuthorModal';
import Book from 'Book/Book';
import * as commandNames from 'Commands/commandNames';
import { useExecuteCommand } from 'Commands/useCommands';
import IconButton from 'Components/Link/IconButton';
import Link from 'Components/Link/Link';
import SpinnerIconButton from 'Components/Link/SpinnerIconButton';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import { icons } from 'Helpers/Props';
import stripHtml from 'Utilities/String/stripHtml';
import translate from 'Utilities/String/translate';
import { useBookIndexOverviewOptions } from '../bookIndexOptionsStore';
import BookIndexProgressBar from '../ProgressBar/BookIndexProgressBar';
import BookIndexPosterSelect from '../Select/BookIndexPosterSelect';
import { useBookIndexSelect } from '../Select/BookIndexSelectContext';
import useBookIndexItem from '../useBookIndexItem';
import BookIndexOverviewInfo from './BookIndexOverviewInfo';
import { ROW_BORDER, ROW_VERTICAL_PADDING } from './overviewLayout';
import styles from './BookIndexOverview.module.css';

// Mirrors .synopsis font-size/line-height in BookIndexOverview.css.
const SYNOPSIS_FONT_SIZE = 13.5;
const SYNOPSIS_LINE_HEIGHT = 1.6;

const TITLE_HEIGHT = 38;
const CHIP_STRIP_HEIGHT = 28;

interface BookOverview {
  id: number;
  overview?: string;
}

// GET /book/{id}/overview (the monitored edition's). Fetched per row as the grid
// renders it, so the index never holds every overview.
const useBookOverview = (bookId: number) => {
  const { data } = useApiQuery<BookOverview>({
    path: `/book/${bookId}/overview`,
    queryOptions: {
      staleTime: 5 * 60 * 1000,
      retry: false,
    },
  });

  return data?.overview ?? '';
};

interface BookIndexOverviewProps {
  book: Book;
  sortKey: string;
  posterWidth: number;
  posterHeight: number;
  rowHeight: number;
}

function BookIndexOverview(props: BookIndexOverviewProps) {
  const { book, sortKey, posterWidth, posterHeight, rowHeight } = props;

  const { author, qualityProfile, isRefreshingBook, isSearchingBook } =
    useBookIndexItem(book);

  const overviewOptions = useBookIndexOverviewOptions();
  const { isSelectMode } = useBookIndexSelect();
  const executeCommand = useExecuteCommand();
  const overview = useBookOverview(book.id);
  const [isEditAuthorModalOpen, setIsEditAuthorModalOpen] = useState(false);
  const [isDeleteAuthorModalOpen, setIsDeleteAuthorModalOpen] = useState(false);

  const { id: bookId, authorId, title, monitored, titleSlug, images } = book;

  const handleRefreshPress = useCallback(() => {
    executeCommand({ name: commandNames.REFRESH_BOOK, bookId });
  }, [bookId, executeCommand]);

  const handleSearchPress = useCallback(() => {
    executeCommand({ name: commandNames.BOOK_SEARCH, bookIds: [bookId] });
  }, [bookId, executeCommand]);

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

  const {
    bookCount = 0,
    bookFileCount = 0,
    totalBookCount = 0,
  } = book.statistics ?? {};

  const link = `/book/${titleSlug}`;

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

  return (
    <div>
      <div className={styles.content}>
        <div className={styles.poster}>
          <div className={styles.posterContainer}>
            {isSelectMode ? (
              <BookIndexPosterSelect bookId={bookId} titleSlug={titleSlug} />
            ) : null}

            <Link className={styles.link} style={elementStyle} to={link}>
              <AuthorPoster
                style={elementStyle}
                images={images}
                coverType="cover"
                size={250}
                lazy={false}
                overflow={true}
                blurBackground={true}
              />
            </Link>
          </div>

          <BookIndexProgressBar
            monitored={monitored}
            bookCount={bookCount}
            bookFileCount={bookFileCount}
            totalBookCount={totalBookCount}
            width={posterWidth}
            detailedProgressBar={overviewOptions.detailedProgressBar}
          />
        </div>

        <div className={styles.info} style={{ maxHeight: contentHeight }}>
          <div className={styles.titleRow}>
            <Link className={styles.title} to={link}>
              {title}
            </Link>

            <div className={styles.actions}>
              <SpinnerIconButton
                className={styles.action}
                name={icons.REFRESH}
                title={translate('RefreshBook')}
                isSpinning={isRefreshingBook}
                onPress={handleRefreshPress}
              />

              {overviewOptions.showSearchAction ? (
                <SpinnerIconButton
                  className={styles.action}
                  name={icons.SEARCH}
                  title={translate('SearchForMonitoredBooks')}
                  isSpinning={isSearchingBook}
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
            {stripHtml(overview)}
          </Link>

          <BookIndexOverviewInfo
            book={book}
            author={author}
            qualityProfile={qualityProfile}
            overviewOptions={overviewOptions}
            sortKey={sortKey}
          />
        </div>
      </div>

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
    </div>
  );
}

export default BookIndexOverview;
