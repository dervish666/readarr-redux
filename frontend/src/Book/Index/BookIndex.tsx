import classNames from 'classnames';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import NoAuthor from 'Author/NoAuthor';
import BookEditorFooter from 'Book/Editor/BookEditorFooter';
import { SaveBookEditorPayload, useSaveBookEditor } from 'Book/useBooks';
import * as commandNames from 'Commands/commandNames';
import { useCommandExecuting, useExecuteCommand } from 'Commands/useCommands';
import Alert from 'Components/Alert';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import ConfirmModal from 'Components/Modal/ConfirmModal';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageJumpBar from 'Components/Page/PageJumpBar';
import PageToolbar from 'Components/Page/Toolbar/PageToolbar';
import PageToolbarButton from 'Components/Page/Toolbar/PageToolbarButton';
import PageToolbarSection from 'Components/Page/Toolbar/PageToolbarSection';
import PageToolbarSeparator from 'Components/Page/Toolbar/PageToolbarSeparator';
import Column from 'Components/Table/Column';
import TableOptionsModalWrapper from 'Components/Table/TableOptions/TableOptionsModalWrapper';
import useSelectState from 'Helpers/Hooks/useSelectState';
import { align, icons, kinds } from 'Helpers/Props';
import SortDirection from 'Helpers/Props/SortDirection';
import scrollPositions from 'Store/scrollPositions';
import { SelectStateInputProps } from 'typings/props';
import translate from 'Utilities/String/translate';
import getSelectedIds from 'Utilities/Table/getSelectedIds';
import { FILTERS } from './bookIndexFilters';
import BookIndexFooter from './BookIndexFooter';
import {
  BookIndexView,
  setBookIndexOption,
  setBookIndexSort,
  useBookIndexOptions,
} from './bookIndexOptionsStore';
import BookIndexFilterMenu from './Menus/BookIndexFilterMenu';
import BookIndexSortMenu from './Menus/BookIndexSortMenu';
import BookIndexViewMenu from './Menus/BookIndexViewMenu';
import BookIndexOverviews from './Overview/BookIndexOverviews';
import BookIndexOverviewOptionsModal from './Overview/Options/BookIndexOverviewOptionsModal';
import BookIndexPosters from './Posters/BookIndexPosters';
import BookIndexPosterOptionsModal from './Posters/Options/BookIndexPosterOptionsModal';
import { BookIndexSelectProvider } from './Select/BookIndexSelectContext';
import BookIndexTable from './Table/BookIndexTable';
import BookIndexTableOptions from './Table/BookIndexTableOptions';
import useBookIndex, { useBookIndexCustomFilters } from './useBookIndex';
import styles from './BookIndex.css';

interface IndexState {
  app: { dimensions: { isSmallScreen: boolean } };
  bookIndex: { isDeleting: boolean; deleteError?: object };
}

interface JumpBarItems {
  characters: Record<string, number>;
  order: string[];
}

const JUMP_BAR_SORT_KEYS = ['title', 'authorTitle'];

function BookIndex() {
  const {
    data: items,
    totalItems,
    isLoading,
    isFetched,
    error,
  } = useBookIndex();

  const { selectedFilterKey, sortKey, sortDirection, view, columns } =
    useBookIndexOptions();

  const customFilters = useBookIndexCustomFilters();
  const history = useHistory();

  const isSmallScreen = useSelector(
    (state: IndexState) => state.app.dimensions.isSmallScreen
  );

  // The book editor's bulk delete is still a redux thunk (Book/Editor/Delete).
  const { isDeleting, deleteError } = useSelector(
    (state: IndexState) => state.bookIndex
  );

  const executeCommand = useExecuteCommand();
  const isRefreshingAuthors = useCommandExecuting(
    commandNames.BULK_REFRESH_AUTHOR
  );
  const isRefreshingBooks = useCommandExecuting(commandNames.BULK_REFRESH_BOOK);
  const isRssSyncExecuting = useCommandExecuting(commandNames.RSS_SYNC);
  const isCutoffUnmetSearching = useCommandExecuting(
    commandNames.CUTOFF_UNMET_BOOK_SEARCH
  );
  const isMissingSearching = useCommandExecuting(
    commandNames.MISSING_BOOK_SEARCH
  );

  const { saveBookEditor, isSavingBookEditor, saveBookEditorError } =
    useSaveBookEditor();

  const [scroller, setScroller] = useState<HTMLElement | null>(null);

  // Back/forward (or an explicit restore) returns to where the list was left.
  const [scrollTop] = useState(() => {
    const { action, location } = history;
    const state = location.state as
      | { restoreScrollPosition?: boolean }
      | undefined;

    return action === 'POP' || state?.restoreScrollPosition
      ? scrollPositions.bookIndex
      : 0;
  });

  const [jumpToCharacter, setJumpToCharacter] = useState<string | undefined>();
  const [isPosterOptionsModalOpen, setIsPosterOptionsModalOpen] =
    useState(false);
  const [isOverviewOptionsModalOpen, setIsOverviewOptionsModalOpen] =
    useState(false);
  const [isConfirmSearchModalOpen, setIsConfirmSearchModalOpen] =
    useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);

  const [selectState, setSelectState] = useSelectState();
  const { allSelected, allUnselected, selectedState } = selectState;

  useEffect(() => {
    setSelectState({ type: 'updateItems', items });
  }, [items, setSelectState]);

  const selectedBookIds = useMemo(() => {
    return allUnselected ? [] : getSelectedIds(selectedState);
  }, [allUnselected, selectedState]);

  const hasNoBooks = !totalItems;
  const isLoaded = !!(!error && isFetched && items.length && scroller);
  const hasSelection = isSelectMode && selectedBookIds.length > 0;

  const jumpBarItems: JumpBarItems = useMemo(() => {
    if (!JUMP_BAR_SORT_KEYS.includes(sortKey)) {
      return { characters: {}, order: [] };
    }

    const characters = items.reduce<Record<string, number>>((acc, item) => {
      const value = item[sortKey as 'title' | 'authorTitle'] ?? '';
      let char = value.charAt(0);

      if (!isNaN(Number(char))) {
        char = '#';
      }

      acc[char] = (acc[char] ?? 0) + 1;

      return acc;
    }, {});

    const order = Object.keys(characters).sort();

    if (sortDirection === SortDirection.Descending) {
      order.reverse();
    }

    return { characters, order };
  }, [items, sortKey, sortDirection]);

  const handleSelectedChange = useCallback(
    ({ id, value, shiftKey = false }: SelectStateInputProps) => {
      setSelectState({
        type: 'toggleSelected',
        id,
        isSelected: value,
        shiftKey,
        items,
      });
    },
    [items, setSelectState]
  );

  const handleSelectAllChange = useCallback(
    ({ value }: { value: boolean }) => {
      setSelectState({ type: value ? 'selectAll' : 'unselectAll', items });
    },
    [items, setSelectState]
  );

  const handleSelectAllPress = useCallback(() => {
    handleSelectAllChange({ value: !allSelected });
  }, [allSelected, handleSelectAllChange]);

  const handleSelectModePress = useCallback(() => {
    if (!isSelectMode) {
      setSelectState({ type: 'unselectAll', items });
    }

    setIsSelectMode(!isSelectMode);
  }, [isSelectMode, items, setSelectState]);

  const handleRefreshBookPress = useCallback(() => {
    executeCommand({
      name: commandNames.BULK_REFRESH_BOOK,
      // An empty list refreshes every book.
      bookIds: hasSelection ? selectedBookIds : [],
    });
  }, [hasSelection, selectedBookIds, executeCommand]);

  const handleRssSyncPress = useCallback(() => {
    executeCommand({ name: commandNames.RSS_SYNC });
  }, [executeCommand]);

  const handleSearchPress = useCallback(() => {
    setIsConfirmSearchModalOpen(true);
  }, []);

  const handleSearchConfirmed = useCallback(() => {
    executeCommand({
      name: commandNames.BOOK_SEARCH,
      bookIds: hasSelection ? selectedBookIds : items.map((book) => book.id),
    });

    setIsConfirmSearchModalOpen(false);
  }, [hasSelection, selectedBookIds, items, executeCommand]);

  const handleConfirmSearchModalClose = useCallback(() => {
    setIsConfirmSearchModalOpen(false);
  }, []);

  const handleViewSelect = useCallback(
    (value: BookIndexView) => {
      setBookIndexOption('view', value);
      scroller?.scrollTo(0, 0);
    },
    [scroller]
  );

  const handleSortSelect = useCallback((value: string) => {
    setBookIndexSort({ sortKey: value });
  }, []);

  const handleFilterSelect = useCallback((value: string | number) => {
    setBookIndexOption('selectedFilterKey', value);
  }, []);

  const handleTableOptionChange = useCallback(
    ({ columns }: { columns?: Column[] }) => {
      if (columns) {
        setBookIndexOption('columns', columns);
      }
    },
    []
  );

  const handleJumpBarItemPress = useCallback((character: string) => {
    setJumpToCharacter(character);
  }, []);

  const handleScroll = useCallback(({ scrollTop }: { scrollTop: number }) => {
    scrollPositions.bookIndex = scrollTop;
    setJumpToCharacter(undefined);
  }, []);

  const handleSaveSelected = useCallback(
    (changes: Omit<SaveBookEditorPayload, 'bookIds'>) => {
      saveBookEditor({ bookIds: selectedBookIds, ...changes });
    },
    [selectedBookIds, saveBookEditor]
  );

  const viewProps = {
    items,
    sortKey,
    jumpToCharacter,
    scrollTop,
    scroller: scroller as HTMLElement,
    isSmallScreen,
  };

  const refreshLabel = hasSelection
    ? translate('UpdateSelected')
    : translate('UpdateAll');

  let searchLabel = translate(
    selectedFilterKey === 'all' ? 'SearchAll' : 'SearchFiltered'
  );

  if (isSelectMode) {
    searchLabel = translate(hasSelection ? 'SearchSelected' : 'SearchAll');
  }

  const searchCount = hasSelection ? selectedBookIds.length : items.length;

  return (
    <PageContent title={translate('Books')}>
      <PageToolbar>
        <PageToolbarSection>
          <PageToolbarButton
            label={refreshLabel}
            iconName={icons.REFRESH}
            spinningName={icons.REFRESH}
            isSpinning={isRefreshingAuthors || isRefreshingBooks}
            onPress={handleRefreshBookPress}
          />

          <PageToolbarButton
            label={translate('RSSSync')}
            iconName={icons.RSS}
            isSpinning={isRssSyncExecuting}
            isDisabled={hasNoBooks}
            onPress={handleRssSyncPress}
          />

          <PageToolbarSeparator />

          <PageToolbarButton
            label={searchLabel}
            iconName={icons.SEARCH}
            isDisabled={
              isCutoffUnmetSearching || isMissingSearching || !items.length
            }
            onPress={handleSearchPress}
          />

          <PageToolbarSeparator />

          <PageToolbarButton
            label={translate(isSelectMode ? 'BookIndex' : 'BookEditor')}
            iconName={isSelectMode ? icons.AUTHOR_CONTINUING : icons.EDIT}
            isDisabled={hasNoBooks}
            onPress={handleSelectModePress}
          />

          {isSelectMode ? (
            <PageToolbarButton
              label={translate(allSelected ? 'UnselectAll' : 'SelectAll')}
              iconName={icons.CHECK_SQUARE}
              isDisabled={hasNoBooks}
              onPress={handleSelectAllPress}
            />
          ) : null}
        </PageToolbarSection>

        <PageToolbarSection alignContent={align.RIGHT} collapseButtons={false}>
          {view === 'table' ? (
            <TableOptionsModalWrapper
              columns={columns}
              optionsComponent={BookIndexTableOptions}
              onTableOptionChange={handleTableOptionChange}
            >
              <PageToolbarButton
                label={translate('Options')}
                iconName={icons.TABLE}
              />
            </TableOptionsModalWrapper>
          ) : (
            <PageToolbarButton
              label={translate('Options')}
              iconName={view === 'posters' ? icons.POSTER : icons.OVERVIEW}
              isDisabled={hasNoBooks}
              onPress={
                view === 'posters'
                  ? () => setIsPosterOptionsModalOpen(true)
                  : () => setIsOverviewOptionsModalOpen(true)
              }
            />
          )}

          <PageToolbarSeparator />

          <BookIndexViewMenu
            view={view}
            isDisabled={hasNoBooks}
            onViewSelect={handleViewSelect}
          />

          <BookIndexSortMenu
            sortKey={sortKey}
            sortDirection={sortDirection}
            isDisabled={hasNoBooks}
            onSortSelect={handleSortSelect}
          />

          <BookIndexFilterMenu
            selectedFilterKey={selectedFilterKey}
            filters={FILTERS}
            customFilters={customFilters}
            isDisabled={hasNoBooks}
            onFilterSelect={handleFilterSelect}
          />
        </PageToolbarSection>
      </PageToolbar>

      <BookIndexSelectProvider
        isSelectMode={isSelectMode}
        selectedState={selectedState}
        onSelectedChange={handleSelectedChange}
      >
        <div className={styles.pageContentBodyWrapper}>
          <PageContentBody
            registerScroller={setScroller}
            className={styles.contentBody}
            innerClassName={classNames(styles[`${view}InnerContentBody`])}
            onScroll={handleScroll}
          >
            {isLoading ? <LoadingIndicator /> : null}

            {!isLoading && !!error ? (
              <Alert kind={kinds.DANGER}>{translate('BooksLoadError')}</Alert>
            ) : null}

            {isLoaded ? (
              <div className={styles.contentBodyContainer}>
                {view === 'posters' ? (
                  <BookIndexPosters {...viewProps} />
                ) : null}

                {view === 'overview' ? (
                  <BookIndexOverviews {...viewProps} />
                ) : null}

                {view === 'table' ? (
                  <BookIndexTable
                    {...viewProps}
                    allSelected={allSelected}
                    allUnselected={allUnselected}
                    onSelectAllChange={handleSelectAllChange}
                  />
                ) : null}

                <BookIndexFooter />
              </div>
            ) : null}

            {!error && isFetched && !items.length ? (
              <NoAuthor totalItems={totalItems} itemType="books" />
            ) : null}
          </PageContentBody>

          {isLoaded && jumpBarItems.order.length ? (
            <PageJumpBar
              items={jumpBarItems}
              onItemPress={handleJumpBarItemPress}
            />
          ) : null}
        </div>
      </BookIndexSelectProvider>

      {isLoaded && isSelectMode ? (
        <BookEditorFooter
          bookIds={selectedBookIds}
          selectedCount={selectedBookIds.length}
          isSaving={isSavingBookEditor}
          saveError={saveBookEditorError}
          isDeleting={isDeleting}
          deleteError={deleteError}
          onSaveSelected={handleSaveSelected}
        />
      ) : null}

      <BookIndexPosterOptionsModal
        isOpen={isPosterOptionsModalOpen}
        onModalClose={() => setIsPosterOptionsModalOpen(false)}
      />

      <BookIndexOverviewOptionsModal
        isOpen={isOverviewOptionsModalOpen}
        onModalClose={() => setIsOverviewOptionsModalOpen(false)}
      />

      <ConfirmModal
        isOpen={isConfirmSearchModalOpen}
        kind={kinds.DANGER}
        title={translate('MassBookSearch')}
        message={
          <div>
            <div>
              {translate('MassBookSearchWarning', { count: searchCount })}
            </div>
            <div>{translate('ThisCannotBeCancelled')}</div>
          </div>
        }
        confirmLabel={translate('Search')}
        onConfirm={handleSearchConfirmed}
        onCancel={handleConfirmSearchModalClose}
      />
    </PageContent>
  );
}

export default BookIndex;
