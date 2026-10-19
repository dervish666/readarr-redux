import classNames from 'classnames';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import AuthorPoster from 'Author/AuthorPoster';
import { getAuthorStatusDetails } from 'Author/AuthorStatus';
import DeleteAuthorModal from 'Author/Delete/DeleteAuthorModal';
import EditAuthorModal from 'Author/Edit/EditAuthorModal';
import AuthorHistoryTable from 'Author/History/AuthorHistoryTable';
import MonitoringOptionsModal from 'Author/MonitoringOptions/MonitoringOptionsModal';
import useAuthors, {
  useAuthor,
  useToggleAuthorMonitored,
} from 'Author/useAuthors';
import BookEditorFooter from 'Book/Editor/BookEditorFooter';
import {
  useAuthorBooks,
  useSaveBookEditor,
  useToggleBooksMonitored,
} from 'Book/useBooks';
import BookFile from 'BookFile/BookFile';
import BookFileEditorTable from 'BookFile/Editor/BookFileEditorTable';
import useBookFiles from 'BookFile/useBookFiles';
import * as commandNames from 'Commands/commandNames';
import {
  isCommandExecuting,
  useCommands,
  useExecuteCommand,
} from 'Commands/useCommands';
import Alert from 'Components/Alert';
import HeartRating from 'Components/HeartRating';
import Icon from 'Components/Icon';
import IconButton from 'Components/Link/IconButton';
import Link from 'Components/Link/Link';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageToolbar from 'Components/Page/Toolbar/PageToolbar';
import PageToolbarButton from 'Components/Page/Toolbar/PageToolbarButton';
import PageToolbarSection from 'Components/Page/Toolbar/PageToolbarSection';
import PageToolbarSeparator from 'Components/Page/Toolbar/PageToolbarSeparator';
import Tooltip from 'Components/Tooltip/Tooltip';
import usePrevious from 'Helpers/Hooks/usePrevious';
import useSelectState from 'Helpers/Hooks/useSelectState';
import { align, icons, kinds, tooltipPositions } from 'Helpers/Props';
import InteractiveImportModal from 'InteractiveImport/InteractiveImportModal';
import InteractiveSearchFilterMenuConnector from 'InteractiveSearch/InteractiveSearchFilterMenuConnector';
import InteractiveSearchTable from 'InteractiveSearch/InteractiveSearchTable';
import OrganizePreviewModalConnector from 'Organize/OrganizePreviewModalConnector';
import RetagPreviewModalConnector from 'Retag/RetagPreviewModalConnector';
import useAuthorSeries from 'Series/useAuthorSeries';
import { useMetadataProfile } from 'Settings/Profiles/Metadata/useMetadataProfiles';
import QualityProfileName from 'Settings/Profiles/Quality/QualityProfileName';
import { clearBookFiles, fetchBookFiles } from 'Store/Actions/bookFileActions';
import {
  cancelFetchReleases,
  clearReleases,
} from 'Store/Actions/releaseActions';
import { SelectStateInputProps } from 'typings/props';
import { ApiError } from 'Utilities/Fetch/fetchJson';
import formatBytes from 'Utilities/Number/formatBytes';
import {
  registerPagePopulator,
  unregisterPagePopulator,
} from 'Utilities/pagePopulator';
import stripHtml from 'Utilities/String/stripHtml';
import translate from 'Utilities/String/translate';
import getSelectedIds from 'Utilities/Table/getSelectedIds';
import toggleSelected from 'Utilities/Table/toggleSelected';
import AuthorDetailsBooks from './AuthorDetailsBooks';
import AuthorDetailsLinks from './AuthorDetailsLinks';
import AuthorDetailsSeries from './AuthorDetailsSeries';
import AuthorTags from './AuthorTags';
import styles from './AuthorDetails.css';

const SEARCH_TAB_INDEX = 3;

interface ExpandedState {
  allExpanded: boolean;
  allCollapsed: boolean;
  series: Record<number, boolean>;
}

// The book editor's bulk delete is still the redux bookIndex thunk (DeleteBookModal).
interface BookIndexDeleteState {
  bookIndex: {
    isDeleting: boolean;
    deleteError?: ApiError | null;
  };
}

function getFanartUrl(author: {
  images: { coverType: string; url: string }[];
}) {
  return author.images.find((image) => image.coverType === 'fanart')?.url;
}

interface AuthorDetailsProps {
  authorId: number;
}

function AuthorDetails({ authorId }: AuthorDetailsProps) {
  const dispatch = useDispatch();
  const executeCommand = useExecuteCommand();

  const author = useAuthor(authorId);
  const { data: allAuthors } = useAuthors();
  const metadataProfile = useMetadataProfile(author?.metadataProfileId);

  const { toggleAuthorMonitored, isTogglingAuthorMonitored } =
    useToggleAuthorMonitored();
  const { toggleBooksMonitored, togglingBookIds } = useToggleBooksMonitored();
  const { saveBookEditor, isSavingBookEditor, saveBookEditorError } =
    useSaveBookEditor();

  const { isDeleting: isDeletingBooks, deleteError: deleteBooksError } =
    useSelector((state: BookIndexDeleteState) => state.bookIndex);

  const {
    data: books,
    booksMap,
    isFetching: isBooksFetching,
    isFetched: isBooksFetched,
    error: booksError,
    refetch: refetchBooks,
  } = useAuthorBooks(authorId);

  const {
    data: bookFiles,
    hasBookFiles,
    isFetching: isBookFilesFetching,
    isFetched: isBookFilesFetched,
    error: bookFilesError,
    refetch: refetchBookFiles,
  } = useBookFiles({ authorId });

  const {
    data: series,
    isFetching: isSeriesFetching,
    isFetched: isSeriesFetched,
    refetch: refetchSeries,
  } = useAuthorSeries(authorId);

  const { data: commands } = useCommands();

  const { isRefreshing, isRenaming, isSearching } = useMemo(() => {
    const refreshCommands = commands.filter(
      (command) =>
        command.name === commandNames.REFRESH_AUTHOR &&
        isCommandExecuting(command)
    );

    const isAuthorRefreshing = refreshCommands.some(
      (command) => command.body.authorId === authorId
    );

    const allAuthorRefreshing = refreshCommands.some(
      (command) => !command.body.authorId
    );

    const isRenamingFiles = commands.some(
      (command) =>
        command.name === commandNames.RENAME_FILES &&
        command.body.authorId === authorId &&
        isCommandExecuting(command)
    );

    const isRenamingAuthor = commands.some(
      (command) =>
        command.name === commandNames.RENAME_AUTHOR &&
        !!command.body.authorIds?.includes(authorId) &&
        isCommandExecuting(command)
    );

    return {
      isRefreshing: isAuthorRefreshing || allAuthorRefreshing,
      isRenaming: isRenamingFiles || isRenamingAuthor,
      isSearching: commands.some(
        (command) =>
          command.name === commandNames.AUTHOR_SEARCH &&
          command.body.authorId === authorId &&
          isCommandExecuting(command)
      ),
    };
  }, [authorId, commands]);

  const { previousAuthor, nextAuthor } = useMemo(() => {
    const sortedAuthors = [...allAuthors].sort((a, b) =>
      a.sortNameLastFirst.localeCompare(b.sortNameLastFirst)
    );
    const index = sortedAuthors.findIndex((a) => a.id === authorId);

    if (index === -1) {
      return { previousAuthor: undefined, nextAuthor: undefined };
    }

    return {
      previousAuthor:
        sortedAuthors[index - 1] ?? sortedAuthors[sortedAuthors.length - 1],
      nextAuthor: sortedAuthors[index + 1] ?? sortedAuthors[0],
    };
  }, [allAuthors, authorId]);

  const bookFilesByBookId = useMemo(() => {
    // The first file of each book, as the JS rows showed.
    return bookFiles.reduce((acc, file) => {
      if (!acc.has(file.bookId)) {
        acc.set(file.bookId, file);
      }

      return acc;
    }, new Map<number, BookFile>());
  }, [bookFiles]);

  const sortedSeries = useMemo(() => {
    return [...series].sort((a, b) => a.title.localeCompare(b.title));
  }, [series]);

  const [isOrganizeModalOpen, setIsOrganizeModalOpen] = useState(false);
  const [isRetagModalOpen, setIsRetagModalOpen] = useState(false);
  const [isEditAuthorModalOpen, setIsEditAuthorModalOpen] = useState(false);
  const [isDeleteAuthorModalOpen, setIsDeleteAuthorModalOpen] = useState(false);
  const [isInteractiveImportModalOpen, setIsInteractiveImportModalOpen] =
    useState(false);
  const [isMonitorOptionsModalOpen, setIsMonitorOptionsModalOpen] =
    useState(false);
  const [isEditorActive, setIsEditorActive] = useState(false);
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const [expandedState, setExpandedState] = useState<ExpandedState>({
    allExpanded: false,
    allCollapsed: false,
    series: {},
  });

  const [selectState, setSelectState] = useSelectState();
  const selectedBookIds = useMemo(
    () => getSelectedIds(selectState.selectedState) as number[],
    [selectState.selectedState]
  );

  const wasRefreshing = usePrevious(isRefreshing);
  const wasRenaming = usePrevious(isRenaming);

  // The book editor's JS delete modal (Book/Editor/Delete) lists the selected books'
  // files from the redux bookFiles feed, and the Search tab is still the JS table on
  // the redux releases feed, so the page keeps fetching and clearing those for them.
  const populate = useCallback(() => {
    refetchBooks();
    refetchBookFiles();
    refetchSeries();
    dispatch(fetchBookFiles({ authorId }));
  }, [authorId, dispatch, refetchBooks, refetchBookFiles, refetchSeries]);

  useEffect(() => {
    dispatch(fetchBookFiles({ authorId }));

    return () => {
      dispatch(cancelFetchReleases());
      dispatch(clearBookFiles());
      dispatch(clearReleases());
    };
  }, [authorId, dispatch]);

  useEffect(() => {
    registerPagePopulator(populate);

    return () => {
      unregisterPagePopulator(populate);
    };
  }, [populate]);

  useEffect(() => {
    if ((wasRefreshing && !isRefreshing) || (wasRenaming && !isRenaming)) {
      populate();
    }
  }, [isRefreshing, wasRefreshing, isRenaming, wasRenaming, populate]);

  useEffect(() => {
    setSelectState({ type: 'updateItems', items: books });
  }, [books, setSelectState]);

  const overviewRef = useRef<HTMLParagraphElement>(null);
  const [isOverviewClamped, setIsOverviewClamped] = useState(false);
  const overview = author?.overview ? stripHtml(author.overview) : '';

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
    if (author) {
      toggleAuthorMonitored({ authorId, monitored: !author.monitored });
    }
  }, [author, authorId, toggleAuthorMonitored]);

  const handleMonitorBooks = useCallback(
    (bookIds: number[], monitored: boolean) => {
      toggleBooksMonitored({ bookIds, monitored });
    },
    [toggleBooksMonitored]
  );

  const handleRefreshPress = useCallback(() => {
    executeCommand({ name: commandNames.REFRESH_AUTHOR, authorId });
  }, [authorId, executeCommand]);

  const handleSearchPress = useCallback(() => {
    executeCommand({ name: commandNames.AUTHOR_SEARCH, authorId });
  }, [authorId, executeCommand]);

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
  const handleInteractiveImportPress = useCallback(
    () => setIsInteractiveImportModalOpen(true),
    []
  );
  const handleInteractiveImportModalClose = useCallback(
    () => setIsInteractiveImportModalOpen(false),
    []
  );
  const handleEditAuthorPress = useCallback(
    () => setIsEditAuthorModalOpen(true),
    []
  );
  const handleEditAuthorModalClose = useCallback(
    () => setIsEditAuthorModalOpen(false),
    []
  );
  const handleDeleteAuthorPress = useCallback(() => {
    setIsEditAuthorModalOpen(false);
    setIsDeleteAuthorModalOpen(true);
  }, []);
  const handleDeleteAuthorModalClose = useCallback(
    () => setIsDeleteAuthorModalOpen(false),
    []
  );
  const handleMonitorOptionsPress = useCallback(
    () => setIsMonitorOptionsModalOpen(true),
    []
  );
  const handleMonitorOptionsClose = useCallback(
    () => setIsMonitorOptionsModalOpen(false),
    []
  );
  const handleBookEditorTogglePress = useCallback(() => {
    setIsEditorActive((value) => !value);
  }, []);
  const handleToggleOverview = useCallback(() => {
    setIsOverviewExpanded((value) => !value);
  }, []);

  const handleSelectAllPress = useCallback(() => {
    setSelectState({
      type: selectState.allSelected ? 'unselectAll' : 'selectAll',
      items: books,
    });
  }, [books, selectState.allSelected, setSelectState]);

  const handleSelectedChange = useCallback(
    (
      items: typeof books,
      { id, value, shiftKey = false }: SelectStateInputProps
    ) => {
      setSelectState({
        type: 'toggleSelected',
        items,
        id,
        isSelected: value,
        shiftKey,
      });
    },
    [setSelectState]
  );

  const handleSaveSelected = useCallback(
    (changes: { monitored?: boolean }) => {
      saveBookEditor({ bookIds: selectedBookIds, ...changes });
    },
    [selectedBookIds, saveBookEditor]
  );

  const handleExpandAllPress = useCallback(() => {
    setExpandedState((state) => {
      const expandAll = !state.allExpanded;

      return {
        allExpanded: expandAll,
        allCollapsed: !expandAll,
        series: Object.keys(state.series).reduce<Record<number, boolean>>(
          (acc, key) => {
            acc[Number(key)] = expandAll;
            return acc;
          },
          {}
        ),
      };
    });
  }, []);

  const handleExpandPress = useCallback(
    (seriesId: number, isExpanded: boolean) => {
      setExpandedState((state) => {
        const newState = toggleSelected(
          {
            allSelected: state.allExpanded,
            allUnselected: state.allCollapsed,
            selectedState: state.series,
            lastToggled: null,
          },
          [],
          seriesId,
          isExpanded,
          false
        );

        return {
          allExpanded: newState.allSelected,
          allCollapsed: newState.allUnselected,
          series: newState.selectedState,
        };
      });
    },
    []
  );

  const handleTabSelect = useCallback((index: number) => {
    setSelectedTabIndex(index);
  }, []);

  if (!author) {
    return null;
  }

  const {
    authorName,
    ratings,
    path,
    statistics,
    qualityProfileId,
    monitored,
    status,
    links,
    images,
    tags,
  } = author;

  const {
    bookFileCount = 0,
    totalBookCount = 0,
    sizeOnDisk = 0,
  } = statistics ?? {};

  const hasBooks = books.length > 0;
  const hasMonitoredBooks = books.some((book) => book.monitored);
  const statusDetails = getAuthorStatusDetails(status);
  const fanartUrl = getFanartUrl(author);

  let bookFilesCountMessage = translate('BookFilesCountMessage');

  if (bookFileCount === 1) {
    bookFilesCountMessage = '1 book file';
  } else if (bookFileCount > 1) {
    bookFilesCountMessage = `${bookFileCount} book files`;
  }

  const isFetching = isBooksFetching || isBookFilesFetching || isSeriesFetching;
  const isPopulated = isBooksFetched && isBookFilesFetched && isSeriesFetched;

  let expandIcon = icons.EXPAND_INDETERMINATE;

  if (expandedState.allExpanded) {
    expandIcon = icons.COLLAPSE;
  } else if (expandedState.allCollapsed) {
    expandIcon = icons.EXPAND;
  }

  return (
    <PageContent title={authorName}>
      <PageToolbar>
        <PageToolbarSection>
          <PageToolbarButton
            label={translate('RefreshAndScan')}
            iconName={icons.REFRESH}
            spinningName={icons.REFRESH}
            title={translate('RefreshInformationAndScanDisk')}
            isSpinning={isRefreshing}
            onPress={handleRefreshPress}
          />

          <PageToolbarButton
            label={translate('SearchMonitored')}
            iconName={icons.SEARCH}
            isDisabled={!monitored || !hasMonitoredBooks || !hasBooks}
            isSpinning={isSearching}
            title={
              hasMonitoredBooks
                ? undefined
                : translate('HasMonitoredBooksNoMonitoredBooksForThisAuthor')
            }
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

          <PageToolbarButton
            label={translate('ManualImport')}
            iconName={icons.INTERACTIVE}
            onPress={handleInteractiveImportPress}
          />

          <PageToolbarSeparator />

          <PageToolbarButton
            label={translate('BookMonitoring')}
            iconName={icons.MONITORED}
            onPress={handleMonitorOptionsPress}
          />

          <PageToolbarButton
            label={translate('Edit')}
            iconName={icons.EDIT}
            onPress={handleEditAuthorPress}
          />

          <PageToolbarButton
            label={translate('Delete')}
            iconName={icons.DELETE}
            onPress={handleDeleteAuthorPress}
          />

          <PageToolbarSeparator />

          {isEditorActive ? (
            <PageToolbarButton
              label={translate('BookList')}
              iconName={icons.AUTHOR_CONTINUING}
              onPress={handleBookEditorTogglePress}
            />
          ) : (
            <PageToolbarButton
              label={translate('BookEditor')}
              iconName={icons.EDIT}
              onPress={handleBookEditorTogglePress}
            />
          )}

          {isEditorActive ? (
            <PageToolbarButton
              label={
                selectState.allSelected
                  ? translate('UnselectAll')
                  : translate('SelectAll')
              }
              iconName={icons.CHECK_SQUARE}
              onPress={handleSelectAllPress}
            />
          ) : null}
        </PageToolbarSection>

        <PageToolbarSection alignContent={align.RIGHT}>
          <PageToolbarButton
            label={
              expandedState.allExpanded
                ? translate('AllExpandedCollapseAll')
                : translate('AllExpandedExpandAll')
            }
            iconName={expandIcon}
            onPress={handleExpandAllPress}
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

          <div className={styles.authorNavigationButtons}>
            {previousAuthor ? (
              <IconButton
                className={styles.authorNavigationButton}
                name={icons.ARROW_LEFT}
                size={24}
                title={translate('GoToInterp', {
                  0: previousAuthor.authorName,
                })}
                aria-label={translate('GoToInterp', {
                  0: previousAuthor.authorName,
                })}
                to={`/author/${previousAuthor.titleSlug}`}
              />
            ) : null}

            <IconButton
              className={styles.authorNavigationButton}
              name={icons.ARROW_UP}
              size={24}
              title={translate('GoToAuthorListing')}
              aria-label={translate('GoToAuthorListing')}
              to="/"
            />

            {nextAuthor ? (
              <IconButton
                className={styles.authorNavigationButton}
                name={icons.ARROW_RIGHT}
                size={24}
                title={translate('GoToInterp', { 0: nextAuthor.authorName })}
                aria-label={translate('GoToInterp', {
                  0: nextAuthor.authorName,
                })}
                to={`/author/${nextAuthor.titleSlug}`}
              />
            ) : null}
          </div>

          <div className={styles.headerContent}>
            <AuthorPoster
              className={styles.poster}
              images={images}
              size={250}
              lazy={false}
            />

            <div className={styles.info}>
              <div className={styles.titleRow}>
                <div className={styles.title}>{authorName}</div>
              </div>

              {ratings.value ? (
                <div className={styles.details}>
                  <HeartRating rating={ratings.value} iconSize={14} />
                </div>
              ) : null}

              <div className={styles.detailsChips}>
                <div className={styles.chipsRow}>
                  <Link
                    className={styles.monitoredToggle}
                    isDisabled={isTogglingAuthorMonitored}
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
                        isSpinning={isTogglingAuthorMonitored}
                      />
                      <span className={styles.chipText}>
                        {monitored
                          ? translate('Monitored')
                          : translate('Unmonitored')}
                      </span>
                    </span>
                  </Link>

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

                  {tags.length ? (
                    <Tooltip
                      anchor={
                        <span className={styles.detailsLabel}>
                          <Icon name={icons.TAGS} size={14} />
                          <span className={styles.chipText}>
                            {translate('Tags')}
                          </span>
                        </span>
                      }
                      tooltip={<AuthorTags authorId={authorId} />}
                      kind={kinds.DEFAULT}
                      position={tooltipPositions.BOTTOM}
                    />
                  ) : null}
                </div>

                <div className={styles.chipsRow}>
                  <span
                    className={styles.detailsLabel}
                    title={bookFilesCountMessage}
                  >
                    <Icon name={icons.DRIVE} size={14} />
                    <span className={styles.chipText}>
                      {formatBytes(sizeOnDisk)}
                    </span>
                  </span>

                  <span
                    className={styles.detailsLabel}
                    title={translate('QualityProfile')}
                  >
                    <Icon name={icons.PROFILE} size={14} />
                    <span className={styles.chipText}>
                      <QualityProfileName qualityProfileId={qualityProfileId} />
                    </span>
                  </span>

                  {metadataProfile ? (
                    <span
                      className={styles.detailsLabel}
                      title={translate('MetadataProfile')}
                    >
                      <Icon name={icons.BOOK} size={14} />
                      <span className={styles.chipText}>
                        {metadataProfile.name}
                      </span>
                    </span>
                  ) : null}

                  <span
                    className={styles.detailsLabel}
                    title={statusDetails.message}
                  >
                    <Icon name={statusDetails.icon} size={14} />
                    <span className={styles.chipText}>
                      {statusDetails.title}
                    </span>
                  </span>
                </div>
              </div>

              <div className={styles.heroFooter} title={path}>
                <Icon name={icons.FOLDER} size={13} />
                <span className={styles.path}>{path}</span>
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

          {!isPopulated && !booksError && !bookFilesError ? (
            <LoadingIndicator />
          ) : null}

          {!isFetching && booksError ? (
            <Alert kind={kinds.DANGER}>{translate('LoadingBooksFailed')}</Alert>
          ) : null}

          {!isFetching && bookFilesError ? (
            <Alert kind={kinds.DANGER}>
              {translate('LoadingBookFilesFailed')}
            </Alert>
          ) : null}

          {isPopulated ? (
            <Tabs selectedIndex={selectedTabIndex} onSelect={handleTabSelect}>
              <TabList className={styles.tabList}>
                <Tab
                  className={styles.tab}
                  selectedClassName={styles.selectedTab}
                >
                  {translate('BooksTotal', { 0: totalBookCount })}
                </Tab>

                <Tab
                  className={styles.tab}
                  selectedClassName={styles.selectedTab}
                >
                  {translate('SeriesTotal', { 0: series.length })}
                </Tab>

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
                    <InteractiveSearchFilterMenuConnector type="author" />
                  </div>
                ) : null}
              </TabList>

              <TabPanel>
                <AuthorDetailsBooks
                  authorName={authorName}
                  authorMonitored={monitored}
                  books={books}
                  bookFilesByBookId={bookFilesByBookId}
                  togglingBookIds={togglingBookIds}
                  isEditorActive={isEditorActive}
                  selectState={selectState}
                  onSelectedChange={handleSelectedChange}
                  onMonitorBooks={handleMonitorBooks}
                />
              </TabPanel>

              <TabPanel>
                {sortedSeries.map((item) => {
                  return (
                    <AuthorDetailsSeries
                      key={item.id}
                      authorId={authorId}
                      authorName={authorName}
                      authorMonitored={monitored}
                      series={item}
                      booksMap={booksMap}
                      bookFilesByBookId={bookFilesByBookId}
                      togglingBookIds={togglingBookIds}
                      isExpanded={expandedState.series[item.id]}
                      onExpandPress={handleExpandPress}
                      onMonitorBooks={handleMonitorBooks}
                    />
                  );
                })}
              </TabPanel>

              <TabPanel>
                <AuthorHistoryTable authorId={authorId} />
              </TabPanel>

              <TabPanel>
                <InteractiveSearchTable type="author" authorId={authorId} />
              </TabPanel>

              <TabPanel>
                <BookFileEditorTable authorId={authorId} />
              </TabPanel>
            </Tabs>
          ) : null}
        </div>

        <div className={styles.metadataMessage}>
          {translate('TooManyBooks')}
          <Link to="/settings/profiles"> {translate('MetadataProfile')} </Link>
          or manually
          <Link to={`/add/search?term=${encodeURIComponent(authorName)}`}>
            {' '}
            {translate('Search')}{' '}
          </Link>
          for new items!
        </div>

        <OrganizePreviewModalConnector
          isOpen={isOrganizeModalOpen}
          authorId={authorId}
          onModalClose={handleOrganizeModalClose}
        />

        <RetagPreviewModalConnector
          isOpen={isRetagModalOpen}
          authorId={authorId}
          onModalClose={handleRetagModalClose}
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

        <InteractiveImportModal
          isOpen={isInteractiveImportModalOpen}
          authorId={authorId}
          folder={path}
          allowAuthorChange={false}
          showFilterExistingFiles={true}
          showImportMode={false}
          onModalClose={handleInteractiveImportModalClose}
        />

        <MonitoringOptionsModal
          isOpen={isMonitorOptionsModalOpen}
          authorId={authorId}
          onModalClose={handleMonitorOptionsClose}
        />
      </PageContentBody>

      {isEditorActive ? (
        <BookEditorFooter
          bookIds={selectedBookIds}
          selectedCount={selectedBookIds.length}
          isSaving={isSavingBookEditor}
          saveError={saveBookEditorError}
          isDeleting={isDeletingBooks}
          deleteError={deleteBooksError}
          onSaveSelected={handleSaveSelected}
        />
      ) : null}
    </PageContent>
  );
}

export default AuthorDetails;
