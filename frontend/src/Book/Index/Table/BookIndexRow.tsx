import React, { useCallback, useState } from 'react';
import DeleteAuthorModal from 'Author/Delete/DeleteAuthorModal';
import EditAuthorModal from 'Author/Edit/EditAuthorModal';
import Book from 'Book/Book';
import EditBookModalConnector from 'Book/Edit/EditBookModalConnector';
import * as commandNames from 'Commands/commandNames';
import { useExecuteCommand } from 'Commands/useCommands';
import HeartRating from 'Components/HeartRating';
import IconButton from 'Components/Link/IconButton';
import Link from 'Components/Link/Link';
import SpinnerIconButton from 'Components/Link/SpinnerIconButton';
import RelativeDateCellConnector from 'Components/Table/Cells/RelativeDateCellConnector';
import VirtualTableRowCell from 'Components/Table/Cells/VirtualTableRowCell';
import VirtualTableSelectCell from 'Components/Table/Cells/VirtualTableSelectCell';
import Column from 'Components/Table/Column';
import TagList from 'Components/TagList';
import { icons } from 'Helpers/Props';
import { useTagList } from 'Tags/useTags';
import formatBytes from 'Utilities/Number/formatBytes';
import translate from 'Utilities/String/translate';
import { useBookIndexShowSearchAction } from '../bookIndexOptionsStore';
import {
  useBookIndexSelect,
  useIsBookSelected,
} from '../Select/BookIndexSelectContext';
import useBookIndexItem from '../useBookIndexItem';
import BookStatusCell from './BookStatusCell';
import styles from './BookIndexRow.css';

interface BookIndexRowProps {
  book: Book;
  columns: Column[];
}

function BookIndexRow({ book, columns }: BookIndexRowProps) {
  const { author, qualityProfile, isRefreshingBook, isSearchingBook } =
    useBookIndexItem(book);

  const showSearchAction = useBookIndexShowSearchAction();
  const { isSelectMode, onSelectedChange } = useBookIndexSelect();
  const isSelected = useIsBookSelected(book.id);
  const tagList = useTagList();
  const executeCommand = useExecuteCommand();

  const [isEditAuthorModalOpen, setIsEditAuthorModalOpen] = useState(false);
  const [isDeleteAuthorModalOpen, setIsDeleteAuthorModalOpen] = useState(false);
  const [isEditBookModalOpen, setIsEditBookModalOpen] = useState(false);

  const {
    id: bookId,
    authorId,
    monitored,
    title,
    titleSlug,
    releaseDate,
    added,
    statistics,
    genres = [],
    ratings,
  } = book;

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

  const handleEditBookPress = useCallback(() => {
    setIsEditBookModalOpen(true);
  }, []);

  const handleEditBookModalClose = useCallback(() => {
    setIsEditBookModalOpen(false);
  }, []);

  const { bookFileCount = 0, sizeOnDisk = 0 } = statistics ?? {};

  return (
    <>
      {columns.map((column) => {
        const { name: columnName, isVisible } = column;

        if (!isVisible) {
          return null;
        }

        const className = styles[columnName as keyof typeof styles];

        if (columnName === 'select') {
          return isSelectMode ? (
            <VirtualTableSelectCell
              inputClassName={styles.checkInput}
              id={bookId}
              key={columnName}
              isSelected={isSelected}
              isDisabled={false}
              onSelectedChange={onSelectedChange}
            />
          ) : null;
        }

        if (columnName === 'status') {
          return (
            <BookStatusCell
              key={columnName}
              className={className}
              monitored={monitored}
            />
          );
        }

        if (columnName === 'title') {
          return (
            <VirtualTableRowCell key={columnName} className={className}>
              <Link className={styles.titleLink} to={`/book/${titleSlug}`}>
                {title}
              </Link>
            </VirtualTableRowCell>
          );
        }

        if (columnName === 'authorName') {
          return (
            <VirtualTableRowCell key={columnName} className={className}>
              {author ? (
                <Link
                  className={styles.authorLink}
                  to={`/author/${author.titleSlug}`}
                >
                  {author.authorName}
                </Link>
              ) : null}
            </VirtualTableRowCell>
          );
        }

        if (columnName === 'qualityProfileId') {
          return (
            <VirtualTableRowCell key={columnName} className={className}>
              {qualityProfile?.name ? (
                <span className={styles.profileChip}>
                  {qualityProfile.name}
                </span>
              ) : null}
            </VirtualTableRowCell>
          );
        }

        if (columnName === 'releaseDate' || columnName === 'added') {
          return (
            <RelativeDateCellConnector
              key={columnName}
              className={className}
              date={columnName === 'releaseDate' ? releaseDate : added}
              component={VirtualTableRowCell}
            />
          );
        }

        if (columnName === 'bookFileCount') {
          return (
            <VirtualTableRowCell key={columnName} className={className}>
              {bookFileCount}
            </VirtualTableRowCell>
          );
        }

        if (columnName === 'path') {
          return (
            <VirtualTableRowCell key={columnName} className={className}>
              <span className={styles.pathText} title={author?.path}>
                {author?.path}
              </span>
            </VirtualTableRowCell>
          );
        }

        if (columnName === 'sizeOnDisk') {
          return (
            <VirtualTableRowCell key={columnName} className={className}>
              {formatBytes(sizeOnDisk)}
            </VirtualTableRowCell>
          );
        }

        if (columnName === 'genres') {
          const joinedGenres = genres.join(', ');

          return (
            <VirtualTableRowCell key={columnName} className={className}>
              <span title={joinedGenres}>{joinedGenres}</span>
            </VirtualTableRowCell>
          );
        }

        if (columnName === 'ratings') {
          return (
            <VirtualTableRowCell key={columnName} className={className}>
              <HeartRating rating={ratings?.value ?? 0} />
            </VirtualTableRowCell>
          );
        }

        if (columnName === 'tags') {
          // Books have no tags in v1; the author's are shown.
          return (
            <VirtualTableRowCell key={columnName} className={className}>
              <TagList tags={author?.tags ?? []} tagList={tagList} />
            </VirtualTableRowCell>
          );
        }

        if (columnName === 'actions') {
          return (
            <VirtualTableRowCell key={columnName} className={className}>
              <SpinnerIconButton
                name={icons.REFRESH}
                title={translate('RefreshBook')}
                isSpinning={isRefreshingBook}
                onPress={handleRefreshPress}
              />

              {showSearchAction ? (
                <SpinnerIconButton
                  name={icons.SEARCH}
                  title={translate('SearchForMonitoredBooks')}
                  isSpinning={isSearchingBook}
                  onPress={handleSearchPress}
                />
              ) : null}

              <IconButton
                name={icons.INTERACTIVE}
                title={translate('EditAuthor')}
                aria-label={translate('EditAuthor')}
                onPress={handleEditAuthorPress}
              />

              <IconButton
                name={icons.EDIT}
                title={translate('EditBook')}
                aria-label={translate('EditBook')}
                onPress={handleEditBookPress}
              />
            </VirtualTableRowCell>
          );
        }

        return null;
      })}

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

      <EditBookModalConnector
        isOpen={isEditBookModalOpen}
        authorId={authorId}
        bookId={bookId}
        onModalClose={handleEditBookModalClose}
      />
    </>
  );
}

export default BookIndexRow;
