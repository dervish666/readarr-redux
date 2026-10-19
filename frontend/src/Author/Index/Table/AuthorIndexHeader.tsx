import classNames from 'classnames';
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
import {
  setAuthorIndexOption,
  setAuthorIndexSort,
} from '../authorIndexOptionsStore';
import AuthorIndexTableOptions from './AuthorIndexTableOptions';
import hasGrowableColumns from './hasGrowableColumns';
import styles from './AuthorIndexHeader.css';

interface AuthorIndexHeaderProps {
  columns: Column[];
  sortKey: string;
  sortDirection: SortDirection;
  showBanners: boolean;
  isSelectMode: boolean;
  allSelected: boolean;
  allUnselected: boolean;
  onSelectAllChange: (change: { value: boolean }) => void;
}

function getLabel(label: Column['label']) {
  return typeof label === 'function' ? label() : label;
}

function AuthorIndexHeader(props: AuthorIndexHeaderProps) {
  const {
    columns,
    sortKey,
    sortDirection,
    showBanners,
    isSelectMode,
    allSelected,
    allUnselected,
    onSelectAllChange,
  } = props;

  const handleSortPress = useCallback((value: string) => {
    setAuthorIndexSort({ sortKey: value });
  }, []);

  const handleTableOptionChange = useCallback(
    ({ columns }: { columns?: Column[] }) => {
      if (columns) {
        setAuthorIndexOption('columns', columns);
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
                optionsComponent={AuthorIndexTableOptions}
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
            className={classNames(
              styles[name as keyof typeof styles],
              name === 'sortName' && showBanners && styles.banner,
              name === 'sortName' &&
                showBanners &&
                !hasGrowableColumns(columns) &&
                styles.bannerGrow
            )}
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

export default AuthorIndexHeader;
