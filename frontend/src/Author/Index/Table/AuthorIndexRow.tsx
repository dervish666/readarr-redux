import classNames from 'classnames';
import React, { useCallback, useState } from 'react';
import AuthorBanner from 'Author/AuthorBanner';
import AuthorNameLink from 'Author/AuthorNameLink';
import DeleteAuthorModal from 'Author/Delete/DeleteAuthorModal';
import EditAuthorModalConnector from 'Author/Edit/EditAuthorModalConnector';
import {
  useAuthorIndexSelect,
  useIsAuthorSelected,
} from 'Author/Index/Select/AuthorIndexSelectContext';
import BookTitleLink from 'Book/BookTitleLink';
import * as commandNames from 'Commands/commandNames';
import { useExecuteCommand } from 'Commands/useCommands';
import HeartRating from 'Components/HeartRating';
import IconButton from 'Components/Link/IconButton';
import Link from 'Components/Link/Link';
import SpinnerIconButton from 'Components/Link/SpinnerIconButton';
import ProgressBar from 'Components/ProgressBar';
import RelativeDateCellConnector from 'Components/Table/Cells/RelativeDateCellConnector';
import VirtualTableRowCell from 'Components/Table/Cells/VirtualTableRowCell';
import VirtualTableSelectCell from 'Components/Table/Cells/VirtualTableSelectCell';
import Column from 'Components/Table/Column';
import TagList from 'Components/TagList';
import { icons } from 'Helpers/Props';
import { useTagList } from 'Tags/useTags';
import getProgressBarKind from 'Utilities/Author/getProgressBarKind';
import formatBytes from 'Utilities/Number/formatBytes';
import translate from 'Utilities/String/translate';
import {
  useAuthorIndexShowSearchAction,
  useAuthorIndexTableOptions,
} from '../authorIndexOptionsStore';
import useAuthorIndexItem from '../useAuthorIndexItem';
import AuthorStatusCell from './AuthorStatusCell';
import hasGrowableColumns from './hasGrowableColumns';
import styles from './AuthorIndexRow.css';

interface AuthorIndexRowProps {
  authorId: number;
  columns: Column[];
}

function AuthorIndexRow({ authorId, columns }: AuthorIndexRowProps) {
  const {
    author,
    qualityProfile,
    metadataProfile,
    isRefreshingAuthor,
    isSearchingAuthor,
  } = useAuthorIndexItem(authorId);

  const { showBanners, showTitle } = useAuthorIndexTableOptions();
  const showSearchAction = useAuthorIndexShowSearchAction();
  const { isSelectMode, onSelectedChange } = useAuthorIndexSelect();
  const isSelected = useIsAuthorSelected(authorId);
  const tagList = useTagList();
  const executeCommand = useExecuteCommand();

  const [hasBannerError, setHasBannerError] = useState(false);
  const [isEditAuthorModalOpen, setIsEditAuthorModalOpen] = useState(false);
  const [isDeleteAuthorModalOpen, setIsDeleteAuthorModalOpen] = useState(false);

  const handleRefreshPress = useCallback(() => {
    executeCommand({ name: commandNames.REFRESH_AUTHOR, authorId });
  }, [authorId, executeCommand]);

  const handleSearchPress = useCallback(() => {
    executeCommand({ name: commandNames.AUTHOR_SEARCH, authorId });
  }, [authorId, executeCommand]);

  const handleBannerLoad = useCallback(() => {
    setHasBannerError(false);
  }, []);

  const handleBannerLoadError = useCallback(() => {
    setHasBannerError(true);
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
    monitored,
    status,
    authorName,
    authorNameLastFirst,
    titleSlug,
    nextBook,
    lastBook,
    added,
    statistics,
    genres = [],
    ratings,
    path,
    tags = [],
    images,
  } = author;

  const {
    bookCount = 0,
    availableBookCount = 0,
    bookFileCount = 0,
    totalBookCount = 0,
    sizeOnDisk = 0,
  } = statistics ?? {};

  const name = showTitle === 'firstLast' ? authorName : authorNameLastFirst;

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
              id={authorId}
              key={columnName}
              isSelected={isSelected}
              isDisabled={false}
              onSelectedChange={onSelectedChange}
            />
          ) : null;
        }

        if (columnName === 'status') {
          return (
            <AuthorStatusCell
              key={columnName}
              className={className}
              monitored={monitored}
              status={status}
            />
          );
        }

        if (columnName === 'sortName') {
          return (
            <VirtualTableRowCell
              key={columnName}
              className={classNames(
                className,
                showBanners && styles.banner,
                showBanners && !hasGrowableColumns(columns) && styles.bannerGrow
              )}
            >
              {showBanners ? (
                <Link className={styles.link} to={`/author/${titleSlug}`}>
                  <AuthorBanner
                    className={styles.bannerImage}
                    images={images}
                    lazy={false}
                    overflow={true}
                    onError={handleBannerLoadError}
                    onLoad={handleBannerLoad}
                  />

                  {hasBannerError ? (
                    <div className={styles.overlayTitle}>{name}</div>
                  ) : null}
                </Link>
              ) : (
                <AuthorNameLink
                  className={styles.titleLink}
                  titleSlug={titleSlug}
                  authorName={name}
                />
              )}
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

        if (columnName === 'metadataProfileId') {
          return (
            <VirtualTableRowCell key={columnName} className={className}>
              {metadataProfile?.name ? (
                <span className={styles.profileChip}>
                  {metadataProfile.name}
                </span>
              ) : null}
            </VirtualTableRowCell>
          );
        }

        if (columnName === 'nextBook' || columnName === 'lastBook') {
          const book = columnName === 'nextBook' ? nextBook : lastBook;

          return (
            <VirtualTableRowCell key={columnName} className={className}>
              {book ? (
                <BookTitleLink
                  title={book.title}
                  disambiguation={book.disambiguation}
                  titleSlug={book.titleSlug}
                />
              ) : (
                <span className={styles.empty}>{translate('None')}</span>
              )}
            </VirtualTableRowCell>
          );
        }

        if (columnName === 'added') {
          return (
            <RelativeDateCellConnector
              key={columnName}
              className={className}
              date={added}
              component={VirtualTableRowCell}
            />
          );
        }

        if (columnName === 'bookProgress') {
          const progress = bookCount
            ? (availableBookCount / bookCount) * 100
            : 100;

          return (
            <VirtualTableRowCell key={columnName} className={className}>
              <ProgressBar
                progress={progress}
                kind={getProgressBarKind(status, monitored, progress)}
                showText={true}
                text={`${availableBookCount} / ${bookCount}`}
                title={translate('AuthorProgressBarText', {
                  bookCount,
                  availableBookCount,
                  bookFileCount,
                  totalBookCount,
                })}
                width={125}
              />
            </VirtualTableRowCell>
          );
        }

        if (columnName === 'path') {
          return (
            <VirtualTableRowCell key={columnName} className={className}>
              <span className={styles.pathText} title={path}>
                {path}
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
          return (
            <VirtualTableRowCell key={columnName} className={className}>
              <TagList tags={tags} tagList={tagList} />
            </VirtualTableRowCell>
          );
        }

        if (columnName === 'actions') {
          return (
            <VirtualTableRowCell key={columnName} className={className}>
              <SpinnerIconButton
                name={icons.REFRESH}
                title={translate('RefreshAuthor')}
                isSpinning={isRefreshingAuthor}
                onPress={handleRefreshPress}
              />

              {showSearchAction ? (
                <SpinnerIconButton
                  name={icons.SEARCH}
                  title={translate('SearchForMonitoredBooks')}
                  isSpinning={isSearchingAuthor}
                  onPress={handleSearchPress}
                />
              ) : null}

              <IconButton
                name={icons.EDIT}
                title={translate('EditAuthor')}
                aria-label={translate('EditAuthor')}
                onPress={handleEditAuthorPress}
              />
            </VirtualTableRowCell>
          );
        }

        return null;
      })}

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
    </>
  );
}

export default AuthorIndexRow;
