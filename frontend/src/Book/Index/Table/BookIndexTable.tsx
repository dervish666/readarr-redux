import React, { useCallback, useMemo } from 'react';
import { GridCellProps } from 'react-virtualized';
import Book from 'Book/Book';
import VirtualTable from 'Components/Table/VirtualTable';
import VirtualTableRow from 'Components/Table/VirtualTableRow';
import getIndexOfFirstCharacter from 'Utilities/Array/getIndexOfFirstCharacter';
import { useBookIndexOptions } from '../bookIndexOptionsStore';
import { useBookIndexSelect } from '../Select/BookIndexSelectContext';
import BookIndexHeader from './BookIndexHeader';
import BookIndexRow from './BookIndexRow';
import styles from './BookIndexTable.css';

interface BookIndexTableProps {
  items: Book[];
  sortKey: string;
  jumpToCharacter?: string;
  scrollTop?: number;
  scroller: HTMLElement;
  isSmallScreen: boolean;
  allSelected: boolean;
  allUnselected: boolean;
  onSelectAllChange: (change: { value: boolean }) => void;
}

function BookIndexTable(props: BookIndexTableProps) {
  const {
    items,
    sortKey,
    jumpToCharacter,
    scrollTop,
    scroller,
    isSmallScreen,
    allSelected,
    allUnselected,
    onSelectAllChange,
  } = props;

  const { columns, sortDirection } = useBookIndexOptions();
  const { isSelectMode, selectedState } = useBookIndexSelect();

  const scrollIndex = useMemo(() => {
    if (jumpToCharacter == null) {
      return null;
    }

    const index = getIndexOfFirstCharacter(items, sortKey, jumpToCharacter);

    return index > -1 ? index : null;
  }, [jumpToCharacter, items, sortKey]);

  const rowRenderer = useCallback(
    ({ key, rowIndex, style }: GridCellProps) => {
      const book = items[rowIndex];

      return (
        <VirtualTableRow key={key} style={style}>
          <BookIndexRow book={book} columns={columns} />
        </VirtualTableRow>
      );
    },
    [items, columns]
  );

  return (
    <VirtualTable
      className={styles.tableContainer}
      items={items}
      scrollIndex={scrollIndex}
      scrollTop={scrollTop}
      isSmallScreen={isSmallScreen}
      scroller={scroller}
      rowHeight={38}
      overscanRowCount={2}
      rowRenderer={rowRenderer}
      header={
        <BookIndexHeader
          columns={columns}
          sortKey={sortKey}
          sortDirection={sortDirection}
          isSelectMode={isSelectMode}
          allSelected={allSelected}
          allUnselected={allUnselected}
          onSelectAllChange={onSelectAllChange}
        />
      }
      columns={columns}
      selectedState={selectedState}
      isSelectMode={isSelectMode}
      sortKey={sortKey}
      sortDirection={sortDirection}
    />
  );
}

export default BookIndexTable;
