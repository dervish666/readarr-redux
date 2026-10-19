import classNames from 'classnames';
import moment from 'moment';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import AuthorDetailsLinks from 'Author/Details/AuthorDetailsLinks';
import AuthorHistoryTable from 'Author/History/AuthorHistoryTable';
import { useAuthor } from 'Author/useAuthors';
import Book from 'Book/Book';
import BookCover from 'Book/BookCover';
import DeleteBookModal from 'Book/Delete/DeleteBookModal';
import EditBookModal from 'Book/Edit/EditBookModal';
import { useAuthorBooks, useToggleBooksMonitored } from 'Book/useBooks';
import useEditions from 'Book/useEditions';
import BookFileEditorTable from 'BookFile/Editor/BookFileEditorTable';
import useBookFiles from 'BookFile/useBookFiles';
import * as commandNames from 'Commands/commandNames';
import {
  isCommandExecuting,
  useCommands,
  useExecuteCommand,
} from 'Commands/useCommands';
import HeartRating from 'Components/HeartRating';
import Icon from 'Components/Icon';
import IconButton from 'Components/Link/IconButton';
import Link from 'Components/Link/Link';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageToolbar from 'Components/Page/Toolbar/PageToolbar';
import PageToolbarButton from 'Components/Page/Toolbar/PageToolbarButton';
import PageToolbarSection from 'Components/Page/Toolbar/PageToolbarSection';
import PageToolbarSeparator from 'Components/Page/Toolbar/PageToolbarSeparator';
import Tooltip from 'Components/Tooltip/Tooltip';
import usePrevious from 'Helpers/Hooks/usePrevious';
import { icons, kinds, tooltipPositions } from 'Helpers/Props';
import InteractiveSearch from 'InteractiveSearch/InteractiveSearch';
import InteractiveSearchFilterMenu from 'InteractiveSearch/InteractiveSearchFilterMenu';
import { useKeepReleases } from 'InteractiveSearch/useReleases';
import OrganizePreviewModal from 'Organize/OrganizePreviewModal';
import RetagPreviewModal from 'Retag/RetagPreviewModal';
import { useUiSettingsValues } from 'Settings/UI/useUiSettings';
import formatBytes from 'Utilities/Number/formatBytes';
import {
  registerPagePopulator,
  unregisterPagePopulator,
} from 'Utilities/pagePopulator';
import stripHtml from 'Utilities/String/stripHtml';
import translate from 'Utilities/String/translate';
import styles from './BookDetails.css';

const SEARCH_TAB_INDEX = 1;

function getFanartUrl(images?: { coverType: string; url: string }[]) {
  return images?.find((image) => image.coverType === 'fanart')?.url;
}

// The redux page ordered an author's books by release date, oldest first, and
// wrapped around at either end.
function sortByReleaseDate(books: Book[]) {
  return [...books].sort((a, b) =>
    (a.releaseDate ?? '') > (b.releaseDate ?? '') ? 1 : -1
  );
}

interface BookDetailsProps {
  bookId: number;
  // The book as the page found it, shown until the author's book list has loaded.
  initialBook: Book;
}

function BookDetails({ bookId, initialBook }: BookDetailsProps) {
  const executeCommand = useExecuteCommand();
  const { shortDateFormat } = useUiSettingsValues();

  const authorId = initialBook.authorId;
  const author = useAuthor(authorId);

  const {
    data: authorBooks,
    booksMap,
    refetch: refetchBooks,
  } = useAuthorBooks(authorId);

  const book = booksMap.get(bookId) ?? initialBook;

  const { data: editions, refetch: refetchEditions } = useEditions(bookId);

  const { hasBookFiles, refetch: refetchBookFiles } = useBookFiles({
    bookId: [bookId],
  });

  const { toggleBooksMonitored, togglingBookIds } = useToggleBooksMonitored();
  const isTogglingMonitored = togglingBookIds.includes(bookId);

  const { data: commands } = useCommands();

  const { isRefreshing, isSearching, isRenaming } = useMemo(() => {
    return {
      isRefreshing: commands.some(
        (command) =>
          command.name === commandNames.REFRESH_BOOK &&
          command.body.bookId === bookId &&
          isCommandExecuting(command)
      ),
      isSearching: commands.some(
        (command) =>
          command.name === commandNames.BOOK_SEARCH &&
          !!command.body.bookIds?.includes(bookId) &&
          isCommandExecuting(command)
      ),
      isRenaming: commands.some(
        (command) =>
          ((command.name === commandNames.RENAME_FILES &&
            command.body.authorId === authorId) ||
            (command.name === commandNames.RENAME_AUTHOR &&
              !!command.body.authorIds?.includes(authorId))) &&
          isCommandExecuting(command)
      ),
    };
  }, [authorId, bookId, commands]);

  const { previousBook, nextBook } = useMemo(() => {
    const sortedBooks = sortByReleaseDate(authorBooks);
    const index = sortedBooks.findIndex((b) => b.id === bookId);

    if (index === -1) {
      return { previousBook: undefined, nextBook: undefined };
    }

    return {
      previousBook:
        sortedBooks[index - 1] ?? sortedBooks[sortedBooks.length - 1],
      nextBook: sortedBooks[index + 1] ?? sortedBooks[0],
    };
  }, [authorBooks, bookId]);

  const [isOrganizeModalOpen, setIsOrganizeModalOpen] = useState(false);
  const [isRetagModalOpen, setIsRetagModalOpen] = useState(false);
  const [isEditBookModalOpen, setIsEditBookModalOpen] = useState(false);
  const [isDeleteBookModalOpen, setIsDeleteBookModalOpen] = useState(false);
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);

  const wasRefreshing = usePrevious(isRefreshing);
  const wasRenaming = usePrevious(isRenaming);

  const populate = useCallback(() => {
    refetchBooks();
    refetchBookFiles();
    refetchEditions();
  }, [refetchBooks, refetchBookFiles, refetchEditions]);

  useEffect(() => {
    registerPagePopulator(populate);

    return () => {
      unregisterPagePopulator(populate);
    };
  }, [populate]);

  // A rename moves the files; a refresh may change the editions.
  useEffect(() => {
    if ((wasRefreshing && !isRefreshing) || (wasRenaming && !isRenaming)) {
      populate();
    }
  }, [isRefreshing, wasRefreshing, isRenaming, wasRenaming, populate]);

  // The Search tab's releases stay while the page shows this book.
  const searchPayload = useMemo(() => ({ bookId }), [bookId]);

  useKeepReleases(searchPayload);

  // The overview shown is the monitored edition's, as the redux page showed it.
  const overview = useMemo(() => {
    const monitoredEdition = editions.find((edition) => edition.monitored);

    return monitoredEdition?.overview
      ? stripHtml(monitoredEdition.overview)
      : '';
  }, [editions]);

  const overviewRef = useRef<HTMLParagraphElement>(null);
  const [isOverviewClamped, setIsOverviewClamped] = useState(false);

  useLayoutEffect(() => {
    const element = overviewRef.current;

    if (!element) {
      return;
    }

    const compute = () =>
      setIsOverviewClamped(
        !isOverviewExpanded && element.scrollHeight > element.clientHeight
      );

    compute();

    const observer = new ResizeObserver(compute);
    observer.observe(element);

    return () => observer.disconnect();
  }, [overview, isOverviewExpanded]);

  const handleMonitorTogglePress = useCallback(() => {
    toggleBooksMonitored({ bookIds: [bookId], monitored: !book.monitored });
  }, [book.monitored, bookId, toggleBooksMonitored]);

  const handleRefreshPress = useCallback(() => {
    executeCommand({ name: commandNames.REFRESH_BOOK, bookId });
  }, [bookId, executeCommand]);

  const handleSearchPress = useCallback(() => {
    executeCommand({ name: commandNames.BOOK_SEARCH, bookIds: [bookId] });
  }, [bookId, executeCommand]);

  const handleOrganizePress = useCallback(
    () => setIsOrganizeModalOpen(true),
    []
  );
  const handleOrganizeModalClose = useCallback(
    () => setIsOrganizeModalOpen(false),
    []
  );
  const handleRetagPress = useCallback(() => setIsRetagModalOpen(true), []);
  const handleRetagModalClose = useCallback(
    () => setIsRetagModalOpen(false),
    []
  );
  const handleEditBookPress = useCallback(
    () => setIsEditBookModalOpen(true),
    []
  );
  const handleEditBookModalClose = useCallback(
    () => setIsEditBookModalOpen(false),
    []
  );
  const handleDeleteBookPress = useCallback(() => {
    setIsEditBookModalOpen(false);
    setIsDeleteBookModalOpen(true);
  }, []);
  const handleDeleteBookModalClose = useCallback(
    () => setIsDeleteBookModalOpen(false),
    []
  );
  const handleToggleOverview = useCallback(() => {
    setIsOverviewExpanded((value) => !value);
  }, []);
  const handleTabSelect = useCallback((index: number) => {
    setSelectedTabIndex(index);
  }, []);

  const {
    title,
    seriesTitle,
    pageCount,
    ratings,
    releaseDate,
    images,
    links,
    monitored,
    statistics,
  } = book;

  const { bookFileCount = 0, sizeOnDisk = 0 } = statistics ?? {};
  const authorName = author?.authorName ?? '';
  const authorSlug = author?.titleSlug ?? '';
  const fanartUrl = getFanartUrl(author?.images);

  return (
    <PageContent title={title}>
      <PageToolbar>
        <PageToolbarSection>
          <PageToolbarButton
            label={translate('Refresh')}
            iconName={icons.REFRESH}
            spinningName={icons.REFRESH}
            title={translate('RefreshInformation')}
            isSpinning={isRefreshing}
            onPress={handleRefreshPress}
          />

          <PageToolbarButton
            label={translate('SearchBook')}
            iconName={icons.SEARCH}
            isSpinning={isSearching}
            onPress={handleSearchPress}
          />

          <PageToolbarSeparator />

          <PageToolbarButton
            label={translate('PreviewRename')}
            iconName={icons.ORGANIZE}
            isDisabled={!hasBookFiles}
            onPress={handleOrganizePress}
          />

          <PageToolbarButton
            label={translate('PreviewRetag')}
            iconName={icons.RETAG}
            isDisabled={!hasBookFiles}
            onPress={handleRetagPress}
          />

          <PageToolbarSeparator />

          <PageToolbarButton
            label={translate('Edit')}
            iconName={icons.EDIT}
            onPress={handleEditBookPress}
          />

          <PageToolbarButton
            label={translate('Delete')}
            iconName={icons.DELETE}
            onPress={handleDeleteBookPress}
          />
        </PageToolbarSection>
      </PageToolbar>

      <PageContentBody innerClassName={styles.innerContentBody}>
        <div className={styles.header}>
          <div
            className={styles.backdrop}
            style={
              fanartUrl ? { backgroundImage: `url(${fanartUrl})` } : undefined
            }
          >
            <div className={styles.backdropOverlay} />
          </div>

          <div className={styles.bookNavigationButtons}>
            {previousBook ? (
              <IconButton
                className={styles.bookNavigationButton}
                name={icons.ARROW_LEFT}
                size={24}
                title={translate('GoToInterp', { 0: previousBook.title })}
                aria-label={translate('GoToInterp', { 0: previousBook.title })}
                to={`/book/${previousBook.titleSlug}`}
              />
            ) : null}

            <IconButton
              className={styles.bookNavigationButton}
              name={icons.ARROW_UP}
              size={24}
              title={translate('GoToInterp', { 0: authorName })}
              aria-label={translate('GoToInterp', { 0: authorName })}
              to={`/author/${authorSlug}`}
            />

            {nextBook ? (
              <IconButton
                className={styles.bookNavigationButton}
                name={icons.ARROW_RIGHT}
                size={24}
                title={translate('GoToInterp', { 0: nextBook.title })}
                aria-label={translate('GoToInterp', { 0: nextBook.title })}
                to={`/book/${nextBook.titleSlug}`}
              />
            ) : null}
          </div>

          <div className={styles.headerContent}>
            <BookCover
              className={styles.cover}
              images={images}
              size={250}
              lazy={false}
            />

            <div className={styles.info}>
              <div className={styles.titleRow}>
                <div className={styles.title}>{title}</div>
              </div>

              <div className={styles.details}>
                {authorSlug ? (
                  <span className={styles.detailsItem}>
                    <Link
                      className={styles.authorLink}
                      to={`/author/${authorSlug}`}
                    >
                      {authorName}
                    </Link>
                  </span>
                ) : null}

                {seriesTitle ? (
                  <span className={styles.detailsItem}>{seriesTitle}</span>
                ) : null}

                {pageCount ? (
                  <span className={styles.detailsItem}>
                    {`${pageCount} ${translate('Pages').toLowerCase()}`}
                  </span>
                ) : null}

                {ratings.value ? (
                  <span className={styles.detailsItem}>
                    <HeartRating rating={ratings.value} iconSize={14} />
                  </span>
                ) : null}
              </div>

              <div className={styles.detailsChips}>
                <div className={styles.chipsRow}>
                  <Link
                    className={styles.monitoredToggle}
                    isDisabled={isTogglingMonitored}
                    aria-pressed={monitored}
                    title={
                      monitored
                        ? translate('Monitored')
                        : translate('Unmonitored')
                    }
                    onPress={handleMonitorTogglePress}
                  >
                    <span className={styles.detailsLabel}>
                      <Icon
                        name={monitored ? icons.MONITORED : icons.UNMONITORED}
                        size={14}
                        isSpinning={isTogglingMonitored}
                      />
                      <span className={styles.chipText}>
                        {monitored
                          ? translate('Monitored')
                          : translate('Unmonitored')}
                      </span>
                    </span>
                  </Link>

                  {releaseDate ? (
                    <span
                      className={styles.detailsLabel}
                      title={translate('ReleaseDate')}
                    >
                      <Icon name={icons.CALENDAR} size={14} />
                      <span className={styles.chipText}>
                        {moment(releaseDate).format(shortDateFormat)}
                      </span>
                    </span>
                  ) : null}

                  <span
                    className={styles.detailsLabel}
                    title={translate('SizeOnDisk')}
                  >
                    <Icon name={icons.DRIVE} size={14} />
                    <span className={styles.chipText}>
                      {formatBytes(sizeOnDisk)}
                    </span>
                  </span>

                  {links.length ? (
                    <Tooltip
                      anchor={
                        <span className={styles.detailsLabel}>
                          <Icon name={icons.EXTERNAL_LINK} size={14} />
                          <span className={styles.chipText}>
                            {translate('Links')}
                          </span>
                        </span>
                      }
                      tooltip={<AuthorDetailsLinks links={links} />}
                      kind={kinds.DEFAULT}
                      position={tooltipPositions.BOTTOM}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.contentContainer}>
          {overview ? (
            <section className={styles.overviewSection}>
              <div className={styles.overviewFrame} aria-hidden="true">
                <span className={styles.overviewLabel}>
                  {translate('Overview')}
                </span>
              </div>

              <p
                ref={overviewRef}
                className={classNames(
                  styles.overview,
                  !isOverviewExpanded && styles.overviewClamped
                )}
              >
                {overview}
              </p>

              {isOverviewClamped || isOverviewExpanded ? (
                <Link
                  className={styles.overviewToggle}
                  onPress={handleToggleOverview}
                >
                  {isOverviewExpanded ? translate('Less') : translate('More')}
                </Link>
              ) : null}
            </section>
          ) : null}

          <Tabs selectedIndex={selectedTabIndex} onSelect={handleTabSelect}>
            <TabList className={styles.tabList}>
              <Tab
                className={styles.tab}
                selectedClassName={styles.selectedTab}
              >
                {translate('History')}
              </Tab>

              <Tab
                className={styles.tab}
                selectedClassName={styles.selectedTab}
              >
                {translate('Search')}
              </Tab>

              <Tab
                className={styles.tab}
                selectedClassName={styles.selectedTab}
              >
                {translate('FilesTotal', { 0: bookFileCount })}
              </Tab>

              {selectedTabIndex === SEARCH_TAB_INDEX ? (
                <div className={styles.filterIcon}>
                  <InteractiveSearchFilterMenu searchPayload={searchPayload} />
                </div>
              ) : null}
            </TabList>

            <TabPanel>
              <AuthorHistoryTable authorId={authorId} bookId={bookId} />
            </TabPanel>

            <TabPanel>
              <InteractiveSearch searchPayload={searchPayload} />
            </TabPanel>

            <TabPanel>
              <BookFileEditorTable bookId={bookId} />
            </TabPanel>
          </Tabs>
        </div>

        <OrganizePreviewModal
          isOpen={isOrganizeModalOpen}
          authorId={authorId}
          bookId={bookId}
          onModalClose={handleOrganizeModalClose}
        />

        <RetagPreviewModal
          isOpen={isRetagModalOpen}
          authorId={authorId}
          bookId={bookId}
          onModalClose={handleRetagModalClose}
        />

        <EditBookModal
          isOpen={isEditBookModalOpen}
          bookId={bookId}
          onModalClose={handleEditBookModalClose}
        />

        <DeleteBookModal
          isOpen={isDeleteBookModalOpen}
          bookId={bookId}
          authorSlug={authorSlug}
          onModalClose={handleDeleteBookModalClose}
        />
      </PageContentBody>
    </PageContent>
  );
}

export default BookDetails;
