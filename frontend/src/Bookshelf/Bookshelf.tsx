import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  CellMeasurer,
  CellMeasurerCache,
  GridCellProps,
} from 'react-virtualized';
import NoAuthor from 'Author/NoAuthor';
import { FILTERS, useUpdateAuthorMonitor } from 'Author/useAuthors';
import Alert from 'Components/Alert';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import FilterMenu from 'Components/Menu/FilterMenu';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageJumpBar from 'Components/Page/PageJumpBar';
import PageToolbar from 'Components/Page/Toolbar/PageToolbar';
import PageToolbarSection from 'Components/Page/Toolbar/PageToolbarSection';
import Column from 'Components/Table/Column';
import VirtualTable from 'Components/Table/VirtualTable';
import rowStyles from 'Components/Table/VirtualTableRow.css';
import useSelectState from 'Helpers/Hooks/useSelectState';
import { align, kinds } from 'Helpers/Props';
import SortDirection from 'Helpers/Props/SortDirection';
import { SelectStateInputProps } from 'typings/props';
import getIndexOfFirstCharacter from 'Utilities/Array/getIndexOfFirstCharacter';
import translate from 'Utilities/String/translate';
import getSelectedIds from 'Utilities/Table/getSelectedIds';
import BookshelfFilterModal from './BookshelfFilterModal';
import BookshelfFooter, { BookshelfChanges } from './BookshelfFooter';
import {
  setBookshelfOption,
  setBookshelfSort,
  useBookshelfOptions,
} from './bookshelfOptionsStore';
import BookshelfRow from './BookshelfRow';
import BookshelfTableHeader from './BookshelfTableHeader';
import useBookshelf from './useBookshelf';
import styles from './Bookshelf.css';

const COLUMNS: Column[] = [
  {
    name: 'monitored',
    label: '',
    isVisible: true,
  },
  {
    name: 'status',
    label: '',
    isVisible: true,
  },
  {
    name: 'sortName',
    label: () => translate('Name'),
    isSortable: true,
    isVisible: true,
  },
  {
    name: 'bookCount',
    label: () => translate('Books'),
    isSortable: false,
    isVisible: true,
  },
];

interface ShelfState {
  app: { dimensions: { isSmallScreen: boolean } };
}

interface JumpBarItems {
  characters: Record<string, number>;
  order: string[];
}

// Rows grow with the author's book count, so CellMeasurer measures each one.
function Bookshelf() {
  const {
    items,
    totalItems,
    customFilters,
    bookCount,
    booksByAuthor,
    isLoading,
    isFetched,
    error,
  } = useBookshelf();

  const { selectedFilterKey, sortKey, sortDirection } = useBookshelfOptions();

  const isSmallScreen = useSelector(
    (state: ShelfState) => state.app.dimensions.isSmallScreen
  );

  const [cache] = useState(
    () => new CellMeasurerCache({ defaultHeight: 100, fixedWidth: true })
  );

  const [scroller, setScroller] = useState<HTMLElement | null>(null);
  const [estimatedRowSize, setEstimatedRowSize] = useState(100);
  const [jump, setJump] = useState<{ index: number; count: number } | null>(
    null
  );

  // Remounted after a save so its pending choices reset.
  const [footerKey, setFooterKey] = useState(0);

  const [selectState, setSelectState] = useSelectState();
  const { allSelected, allUnselected, selectedState } = selectState;

  useEffect(() => {
    setSelectState({ type: 'updateItems', items });
  }, [items, setSelectState]);

  const selectedAuthorIds = useMemo(() => {
    return allUnselected ? [] : getSelectedIds(selectedState);
  }, [allUnselected, selectedState]);

  const { updateAuthorMonitor, isUpdatingAuthorMonitor } =
    useUpdateAuthorMonitor(() => {
      setSelectState({ type: 'unselectAll', items });
      setFooterKey((key) => key + 1);
    });

  // With variable row heights react-virtualized lands short of the row on the first
  // scroll, so the redux page nudged it one row down and back (the same here).
  useEffect(() => {
    if (!jump) {
      return;
    }

    if (jump.count === 0) {
      setJump({ index: jump.index + 1, count: 1 });
    } else if (jump.count === 1) {
      setJump({ index: jump.index - 1, count: 2 });
    } else {
      setJump(null);
    }
  }, [jump]);

  const jumpBarItems: JumpBarItems = useMemo(() => {
    if (sortKey !== 'sortName') {
      return { characters: {}, order: [] };
    }

    const characters = items.reduce<Record<string, number>>((acc, item) => {
      let char = (item.sortName ?? '').charAt(0);

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

  const handleSortPress = useCallback((value: string) => {
    setBookshelfSort({ sortKey: value });
  }, []);

  const handleFilterSelect = useCallback((value: string | number) => {
    setBookshelfOption('selectedFilterKey', value);
  }, []);

  const handleJumpBarItemPress = useCallback(
    (character: string) => {
      const index = getIndexOfFirstCharacter(items, sortKey, character);

      if (index != null && index > -1) {
        setJump({ index, count: 0 });
      }
    },
    [items, sortKey]
  );

  // POST /bookshelf, v1 BookshelfResource. monitoringOptions only goes when an
  // option was picked: the server reads an empty one as "all" and would monitor
  // every book of the selected authors.
  const handleUpdateSelectedPress = useCallback(
    ({ monitored, monitor, monitorNewItems }: BookshelfChanges) => {
      updateAuthorMonitor({
        authors: selectedAuthorIds.map((id) =>
          monitored == null ? { id } : { id, monitored }
        ),
        ...(monitor ? { monitoringOptions: { monitor } } : {}),
        ...(monitorNewItems ? { monitorNewItems } : {}),
      });
    },
    [selectedAuthorIds, updateAuthorMonitor]
  );

  const handleRecompute = useCallback(
    (width: number) => {
      // Guess 250px per book and 186px for the select, status and name cells;
      // each line of books is 23px plus 16px of padding.
      if (bookCount && items.length) {
        const columns = Math.max(Math.floor((width - 186) / 250), 1);
        const booksPerAuthor = bookCount / items.length;

        setEstimatedRowSize((booksPerAuthor / columns) * 23 + 16);
      } else {
        setEstimatedRowSize(100);
      }

      cache.clearAll();
    },
    [bookCount, items.length, cache]
  );

  const rowRenderer = useCallback(
    ({ key, rowIndex, parent, style }: GridCellProps) => {
      const author = items[rowIndex];

      return (
        <CellMeasurer
          key={key}
          cache={cache}
          parent={parent}
          columnIndex={0}
          rowIndex={rowIndex}
        >
          {({ registerChild }) => (
            <div ref={registerChild} className={rowStyles.row} style={style}>
              <BookshelfRow
                author={author}
                books={booksByAuthor.get(author.id) ?? []}
                isSelected={!!selectedState[author.id]}
                onSelectedChange={handleSelectedChange}
              />
            </div>
          )}
        </CellMeasurer>
      );
    },
    [items, booksByAuthor, selectedState, handleSelectedChange, cache]
  );

  const isLoaded = !error && isFetched;

  return (
    <PageContent title={translate('Bookshelf')}>
      <PageToolbar>
        <PageToolbarSection />

        <PageToolbarSection alignContent={align.RIGHT}>
          <FilterMenu
            alignMenu={align.RIGHT}
            selectedFilterKey={selectedFilterKey}
            filters={FILTERS}
            customFilters={customFilters}
            filterModalConnectorComponent={BookshelfFilterModal}
            onFilterSelect={handleFilterSelect}
          />
        </PageToolbarSection>
      </PageToolbar>

      <div className={styles.pageContentBodyWrapper}>
        <PageContentBody
          registerScroller={setScroller}
          className={styles.contentBody}
          innerClassName={styles.tableInnerContentBody}
        >
          {isLoading ? <LoadingIndicator /> : null}

          {!isLoading && !!error ? (
            <Alert kind={kinds.DANGER}>{translate('AuthorLoadError')}</Alert>
          ) : null}

          {isLoaded && !!items.length && scroller ? (
            <div className={styles.contentBodyContainer}>
              <VirtualTable
                items={items}
                scrollIndex={jump?.index}
                columns={COLUMNS}
                scroller={scroller}
                isSmallScreen={isSmallScreen}
                overscanRowCount={5}
                rowRenderer={rowRenderer}
                header={
                  <BookshelfTableHeader
                    columns={COLUMNS}
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    allSelected={allSelected}
                    allUnselected={allUnselected}
                    onSortPress={handleSortPress}
                    onSelectAllChange={handleSelectAllChange}
                  />
                }
                sortKey={sortKey}
                sortDirection={sortDirection}
                deferredMeasurementCache={cache}
                rowHeight={cache.rowHeight}
                estimatedRowSize={estimatedRowSize}
                onRecompute={handleRecompute}
              />
            </div>
          ) : null}

          {isLoaded && !items.length ? (
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

      <BookshelfFooter
        key={footerKey}
        selectedCount={selectedAuthorIds.length}
        isSaving={isUpdatingAuthorMonitor}
        onUpdateSelectedPress={handleUpdateSelectedPress}
      />
    </PageContent>
  );
}

export default Bookshelf;
