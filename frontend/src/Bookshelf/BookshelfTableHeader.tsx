import React from 'react';
import Column from 'Components/Table/Column';
import VirtualTableHeader from 'Components/Table/VirtualTableHeader';
import VirtualTableHeaderCell from 'Components/Table/VirtualTableHeaderCell';
import VirtualTableSelectAllHeaderCell from 'Components/Table/VirtualTableSelectAllHeaderCell';
import SortDirection from 'Helpers/Props/SortDirection';
import styles from './BookshelfTableHeader.css';

interface BookshelfTableHeaderProps {
  columns: Column[];
  sortKey: string;
  sortDirection: SortDirection;
  allSelected: boolean;
  allUnselected: boolean;
  onSortPress: (sortKey: string) => void;
  onSelectAllChange: (change: { value: boolean }) => void;
}

function BookshelfTableHeader(props: BookshelfTableHeaderProps) {
  const {
    columns,
    sortKey,
    sortDirection,
    allSelected,
    allUnselected,
    onSortPress,
    onSelectAllChange,
  } = props;

  return (
    <VirtualTableHeader>
      <VirtualTableSelectAllHeaderCell
        allSelected={allSelected}
        allUnselected={allUnselected}
        onSelectAllChange={onSelectAllChange}
      />

      {columns.map((column) => {
        const { name, label, isSortable, isVisible } = column;

        if (!isVisible) {
          return null;
        }

        return (
          <VirtualTableHeaderCell
            key={name}
            className={styles[name as keyof typeof styles]}
            name={name}
            isSortable={isSortable}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortPress={onSortPress}
          >
            {typeof label === 'function' ? label() : label}
          </VirtualTableHeaderCell>
        );
      })}
    </VirtualTableHeader>
  );
}

export default BookshelfTableHeader;
