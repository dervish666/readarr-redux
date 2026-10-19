import React, { useCallback, useMemo } from 'react';
import { GridCellProps } from 'react-virtualized';
import Author from 'Author/Author';
import VirtualTable from 'Components/Table/VirtualTable';
import VirtualTableRow from 'Components/Table/VirtualTableRow';
import getIndexOfFirstCharacter from 'Utilities/Array/getIndexOfFirstCharacter';
import {
  useAuthorIndexOptions,
  useAuthorIndexTableOptions,
} from '../authorIndexOptionsStore';
import { useAuthorIndexSelect } from '../Select/AuthorIndexSelectContext';
import AuthorIndexHeader from './AuthorIndexHeader';
import AuthorIndexRow from './AuthorIndexRow';
import styles from './AuthorIndexTable.module.css';

interface AuthorIndexTableProps {
  items: Author[];
  sortKey: string;
  jumpToCharacter?: string;
  scrollTop?: number;
  scroller: HTMLElement;
  isSmallScreen: boolean;
  allSelected: boolean;
  allUnselected: boolean;
  onSelectAllChange: (change: { value: boolean }) => void;
}

function AuthorIndexTable(props: AuthorIndexTableProps) {
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

  const { columns, sortDirection } = useAuthorIndexOptions();
  const { showBanners } = useAuthorIndexTableOptions();
  const { isSelectMode, selectedState } = useAuthorIndexSelect();

  const scrollIndex = useMemo(() => {
    if (jumpToCharacter == null) {
      return null;
    }

    const index = getIndexOfFirstCharacter(items, sortKey, jumpToCharacter);

    return index > -1 ? index : null;
  }, [jumpToCharacter, items, sortKey]);

  const rowRenderer = useCallback(
    ({ key, rowIndex, style }: GridCellProps) => {
      const author = items[rowIndex];

      return (
        <VirtualTableRow key={key} style={style}>
          <AuthorIndexRow authorId={author.id} columns={columns} />
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
      // v5 banners are 56px with an 8px margin above and below.
      rowHeight={showBanners ? 72 : 38}
      overscanRowCount={2}
      rowRenderer={rowRenderer}
      header={
        <AuthorIndexHeader
          columns={columns}
          sortKey={sortKey}
          sortDirection={sortDirection}
          showBanners={showBanners}
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

export default AuthorIndexTable;
