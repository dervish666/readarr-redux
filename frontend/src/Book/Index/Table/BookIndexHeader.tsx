import React, { useCallback } from 'react';
import IconButton from 'Components/Link/IconButton';
import Column from 'Components/Table/Column';
import TableOptionsModalWrapper from 'Components/Table/TableOptions/TableOptionsModalWrapper';
import VirtualTableHeader from 'Components/Table/VirtualTableHeader';
import VirtualTableHeaderCell from 'Components/Table/VirtualTableHeaderCell';
import VirtualTableSelectAllHeaderCell from 'Components/Table/VirtualTableSelectAllHeaderCell';
import { icons } from 'Helpers/Props';
import SortDirection from 'Helpers/Props/SortDirection';
import translate from 'Utilities/String/translate';
import { setBookIndexOption, setBookIndexSort } from '../bookIndexOptionsStore';
import BookIndexTableOptions from './BookIndexTableOptions';
import styles from './BookIndexHeader.css';

interface BookIndexHeaderProps {
  columns: Column[];
  sortKey: string;
  sortDirection: SortDirection;
  isSelectMode: boolean;
  allSelected: boolean;
  allUnselected: boolean;
  onSelectAllChange: (change: { value: boolean }) => void;
}

function getLabel(label: Column['label']) {
  return typeof label === 'function' ? label() : label;
}

function BookIndexHeader(props: BookIndexHeaderProps) {
  const {
    columns,
    sortKey,
    sortDirection,
    isSelectMode,
    allSelected,
    allUnselected,
    onSelectAllChange,
  } = props;

  const handleSortPress = useCallback((value: string) => {
    setBookIndexSort({ sortKey: value });
  }, []);

  const handleTableOptionChange = useCallback(
    ({ columns }: { columns?: Column[] }) => {
      if (columns) {
        setBookIndexOption('columns', columns);
      }
    },
    []
  );

  return (
    <VirtualTableHeader>
      {columns.map((column) => {
        const { name, label, isSortable, isVisible } = column;

        if (!isVisible) {
          return null;
        }

        if (name === 'select') {
          return isSelectMode ? (
            <VirtualTableSelectAllHeaderCell
              key={name}
              allSelected={allSelected}
              allUnselected={allUnselected}
              onSelectAllChange={onSelectAllChange}
            />
          ) : null;
        }

        if (name === 'actions') {
          return (
            <VirtualTableHeaderCell
              key={name}
              className={styles[name]}
              name={name}
              isSortable={false}
            >
              <TableOptionsModalWrapper
                columns={columns}
                optionsComponent={BookIndexTableOptions}
                onTableOptionChange={handleTableOptionChange}
              >
                <IconButton
                  name={icons.ADVANCED_SETTINGS}
                  aria-label={translate('TableOptions')}
                />
              </TableOptionsModalWrapper>
            </VirtualTableHeaderCell>
          );
        }

        return (
          <VirtualTableHeaderCell
            key={name}
            className={styles[name as keyof typeof styles]}
            name={name}
            isSortable={isSortable}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortPress={handleSortPress}
          >
            {getLabel(label)}
          </VirtualTableHeaderCell>
        );
      })}
    </VirtualTableHeader>
  );
}

export default BookIndexHeader;
