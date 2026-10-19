import classNames from 'classnames';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { useAppDimension } from 'App/appStore';
import AuthorEditorFooter from 'Author/Editor/AuthorEditorFooter';
import NoAuthor from 'Author/NoAuthor';
import { FILTERS } from 'Author/useAuthors';
import * as commandNames from 'Commands/commandNames';
import { useCommandExecuting, useExecuteCommand } from 'Commands/useCommands';
import Alert from 'Components/Alert';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageJumpBar from 'Components/Page/PageJumpBar';
import PageToolbar from 'Components/Page/Toolbar/PageToolbar';
import PageToolbarButton from 'Components/Page/Toolbar/PageToolbarButton';
import PageToolbarSection from 'Components/Page/Toolbar/PageToolbarSection';
import PageToolbarSeparator from 'Components/Page/Toolbar/PageToolbarSeparator';
import Column from 'Components/Table/Column';
import TableOptionsModalWrapper from 'Components/Table/TableOptions/TableOptionsModalWrapper';
import { useCustomFiltersList } from 'Filters/useCustomFilters';
import useSelectState from 'Helpers/Hooks/useSelectState';
import { align, icons, kinds } from 'Helpers/Props';
import SortDirection from 'Helpers/Props/SortDirection';
import scrollPositions from 'Helpers/scrollPositions';
import { SelectStateInputProps } from 'typings/props';
import translate from 'Utilities/String/translate';
import getSelectedIds from 'Utilities/Table/getSelectedIds';
import AuthorIndexFooter from './AuthorIndexFooter';
import {
  AuthorIndexView,
  setAuthorIndexOption,
  setAuthorIndexSort,
  useAuthorIndexOptions,
} from './authorIndexOptionsStore';
import AuthorIndexFilterMenu from './Menus/AuthorIndexFilterMenu';
import AuthorIndexSortMenu from './Menus/AuthorIndexSortMenu';
import AuthorIndexViewMenu from './Menus/AuthorIndexViewMenu';
import AuthorIndexOverviews from './Overview/AuthorIndexOverviews';
import AuthorIndexOverviewOptionsModal from './Overview/Options/AuthorIndexOverviewOptionsModal';
import AuthorIndexPosters from './Posters/AuthorIndexPosters';
import AuthorIndexPosterOptionsModal from './Posters/Options/AuthorIndexPosterOptionsModal';
import { AuthorIndexSelectProvider } from './Select/AuthorIndexSelectContext';
import AuthorIndexTable from './Table/AuthorIndexTable';
import AuthorIndexTableOptions from './Table/AuthorIndexTableOptions';
import useAuthorIndex, {
  AUTHOR_INDEX_CUSTOM_FILTER_TYPE,
} from './useAuthorIndex';
import styles from './AuthorIndex.css';

interface JumpBarItems {
  characters: Record<string, number>;
  order: string[];
}

const NAME_SORT_KEYS = ['sortName', 'sortNameLastFirst'];

function AuthorIndex() {
  const {
    data: items,
    totalItems,
    isLoading,
    isFetched,
    isSuccess,
    error,
  } = useAuthorIndex();

  const { selectedFilterKey, sortKey, sortDirection, view, columns } =
    useAuthorIndexOptions();

  const customFilters = useCustomFiltersList(AUTHOR_INDEX_CUSTOM_FILTER_TYPE);
  const location = useLocation();
  const navigationType = useNavigationType();

  const isSmallScreen = useAppDimension('isSmallScreen');

  const executeCommand = useExecuteCommand();
  const isRefreshingAuthor = useCommandExecuting(
    commandNames.BULK_REFRESH_AUTHOR
  );
  const isRssSyncExecuting = useCommandExecuting(commandNames.RSS_SYNC);

  const [scroller, setScroller] = useState<HTMLElement | null>(null);

  // Back/forward (or an explicit restore) returns to where the list was left.
  const [scrollTop] = useState(() => {
    const state = location.state as
      | { restoreScrollPosition?: boolean }
      | undefined;

    return navigationType === 'POP' || state?.restoreScrollPosition
      ? scrollPositions.authorIndex
      : 0;
  });

  const [jumpToCharacter, setJumpToCharacter] = useState<string | undefined>();
  const [isPosterOptionsModalOpen, setIsPosterOptionsModalOpen] =
    useState(false);
  const [isOverviewOptionsModalOpen, setIsOverviewOptionsModalOpen] =
    useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);

  const [selectState, setSelectState] = useSelectState();
  const { allSelected, allUnselected, selectedState } = selectState;

  useEffect(() => {
    // A failed load must not drop the selection.
    if (isSuccess) {
      setSelectState({ type: 'updateItems', items });
    }
  }, [items, isSuccess, setSelectState]);

  const selectedAuthorIds = useMemo(() => {
    return allUnselected ? [] : getSelectedIds(selectedState);
  }, [allUnselected, selectedState]);

  const hasNoAuthor = !totalItems;
  const isLoaded = !!(!error && isFetched && items.length && scroller);

  const jumpBarItems: JumpBarItems = useMemo(() => {
    if (!NAME_SORT_KEYS.includes(sortKey)) {
      return { characters: {}, order: [] };
    }

    const characters = items.reduce<Record<string, number>>((acc, item) => {
      const value = item[sortKey as 'sortName' | 'sortNameLastFirst'] ?? '';
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

  const handleRefreshAuthorPress = useCallback(() => {
    executeCommand({
      name: commandNames.BULK_REFRESH_AUTHOR,
      // An empty list refreshes every author.
      authorIds: isSelectMode ? selectedAuthorIds : [],
    });
  }, [isSelectMode, selectedAuthorIds, executeCommand]);

  const handleRssSyncPress = useCallback(() => {
    executeCommand({ name: commandNames.RSS_SYNC });
  }, [executeCommand]);

  const handleViewSelect = useCallback(
    (value: AuthorIndexView) => {
      setAuthorIndexOption('view', value);
      scroller?.scrollTo(0, 0);
    },
    [scroller]
  );

  const handleSortSelect = useCallback((value: string) => {
    setAuthorIndexSort({ sortKey: value });
  }, []);

  const handleFilterSelect = useCallback((value: string | number) => {
    setAuthorIndexOption('selectedFilterKey', value);
  }, []);

  const handleTableOptionChange = useCallback(
    ({ columns }: { columns?: Column[] }) => {
      if (columns) {
        setAuthorIndexOption('columns', columns);
      }
    },
    []
  );

  const handleJumpBarItemPress = useCallback((character: string) => {
    setJumpToCharacter(character);
  }, []);

  const handleScroll = useCallback(({ scrollTop }: { scrollTop: number }) => {
    scrollPositions.authorIndex = scrollTop;
    setJumpToCharacter(undefined);
  }, []);

  const handleSelectionClear = useCallback(() => {
    handleSelectAllChange({ value: false });
  }, [handleSelectAllChange]);

  const viewProps = {
    items,
    sortKey,
    jumpToCharacter,
    scrollTop,
    scroller: scroller as HTMLElement,
    isSmallScreen,
  };

  const refreshLabel =
    isSelectMode && selectedAuthorIds.length > 0
      ? translate('UpdateSelected')
      : translate('UpdateAll');

  return (
    <PageContent title={translate('Authors')}>
      <PageToolbar>
        <PageToolbarSection>
          <PageToolbarButton
            label={refreshLabel}
            iconName={icons.REFRESH}
            spinningName={icons.REFRESH}
            isSpinning={isRefreshingAuthor}
            isDisabled={hasNoAuthor}
            onPress={handleRefreshAuthorPress}
          />

          <PageToolbarButton
            label={translate('RSSSync')}
            iconName={icons.RSS}
            isSpinning={isRssSyncExecuting}
            isDisabled={hasNoAuthor}
            onPress={handleRssSyncPress}
          />

          <PageToolbarSeparator />

          <PageToolbarButton
            label={translate(isSelectMode ? 'AuthorIndex' : 'AuthorEditor')}
            iconName={isSelectMode ? icons.AUTHOR_CONTINUING : icons.EDIT}
            isDisabled={hasNoAuthor}
            onPress={handleSelectModePress}
          />

          {isSelectMode ? (
            <PageToolbarButton
              label={translate(allSelected ? 'UnselectAll' : 'SelectAll')}
              iconName={icons.CHECK_SQUARE}
              isDisabled={hasNoAuthor}
              onPress={handleSelectAllPress}
            />
          ) : null}
        </PageToolbarSection>

        <PageToolbarSection alignContent={align.RIGHT} collapseButtons={false}>
          {view === 'table' ? (
            <TableOptionsModalWrapper
              columns={columns}
              optionsComponent={AuthorIndexTableOptions}
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
              isDisabled={hasNoAuthor}
              onPress={
                view === 'posters'
                  ? () => setIsPosterOptionsModalOpen(true)
                  : () => setIsOverviewOptionsModalOpen(true)
              }
            />
          )}

          <PageToolbarSeparator />

          <AuthorIndexViewMenu
            view={view}
            isDisabled={hasNoAuthor}
            onViewSelect={handleViewSelect}
          />

          <AuthorIndexSortMenu
            sortKey={sortKey}
            sortDirection={sortDirection}
            isDisabled={hasNoAuthor}
            onSortSelect={handleSortSelect}
          />

          <AuthorIndexFilterMenu
            selectedFilterKey={selectedFilterKey}
            filters={FILTERS}
            customFilters={customFilters}
            isDisabled={hasNoAuthor}
            onFilterSelect={handleFilterSelect}
          />
        </PageToolbarSection>
      </PageToolbar>

      <AuthorIndexSelectProvider
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
              <Alert kind={kinds.DANGER}>{translate('AuthorLoadError')}</Alert>
            ) : null}

            {isLoaded ? (
              <div className={styles.contentBodyContainer}>
                {view === 'posters' ? (
                  <AuthorIndexPosters {...viewProps} />
                ) : null}

                {view === 'overview' ? (
                  <AuthorIndexOverviews {...viewProps} />
                ) : null}

                {view === 'table' ? (
                  <AuthorIndexTable
                    {...viewProps}
                    allSelected={allSelected}
                    allUnselected={allUnselected}
                    onSelectAllChange={handleSelectAllChange}
                  />
                ) : null}

                <AuthorIndexFooter />
              </div>
            ) : null}

            {!error && isFetched && !items.length ? (
              <NoAuthor totalItems={totalItems} />
            ) : null}
          </PageContentBody>

          {isLoaded && jumpBarItems.order.length ? (
            <PageJumpBar
              items={jumpBarItems}
              onItemPress={handleJumpBarItemPress}
            />
          ) : null}
        </div>
      </AuthorIndexSelectProvider>

      {isLoaded && isSelectMode ? (
        <AuthorEditorFooter
          authorIds={selectedAuthorIds}
          onSelectionClear={handleSelectionClear}
        />
      ) : null}

      <AuthorIndexPosterOptionsModal
        isOpen={isPosterOptionsModalOpen}
        onModalClose={() => setIsPosterOptionsModalOpen(false)}
      />

      <AuthorIndexOverviewOptionsModal
        isOpen={isOverviewOptionsModalOpen}
        onModalClose={() => setIsOverviewOptionsModalOpen(false)}
      />
    </PageContent>
  );
}

export default AuthorIndex;
