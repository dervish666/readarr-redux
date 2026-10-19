import React from 'react';
import BookQuality from 'Book/BookQuality';
import BookFile from 'BookFile/BookFile';
import RelativeDateCellConnector from 'Components/Table/Cells/RelativeDateCellConnector';
import TableRowCell from 'Components/Table/Cells/TableRowCell';
import TableSelectCell from 'Components/Table/Cells/TableSelectCell';
import Column from 'Components/Table/Column';
import TableRow from 'Components/Table/TableRow';
import { SelectStateInputProps } from 'typings/props';
import formatBytes from 'Utilities/Number/formatBytes';
import BookFileActionsCell from './BookFileActionsCell';
import styles from './BookFileEditorRow.module.css';

interface BookFileEditorRowProps {
  bookFile: BookFile;
  columns: Column[];
  isSelected?: boolean;
  onSelectedChange: (options: SelectStateInputProps) => void;
  onDeletePress: (id: number) => void;
}

function BookFileEditorRow({
  bookFile,
  columns,
  isSelected,
  onSelectedChange,
  onDeletePress,
}: BookFileEditorRowProps) {
  const { id, path, size, dateAdded, quality, qualityCutoffNotMet } = bookFile;

  return (
    <TableRow>
      <TableSelectCell
        id={id}
        isSelected={!!isSelected}
        onSelectedChange={onSelectedChange}
      />

      {columns.map(({ name, isVisible }) => {
        if (!isVisible) {
          return null;
        }

        if (name === 'path') {
          return (
            <TableRowCell key={name} className={styles.path}>
              {path}
            </TableRowCell>
          );
        }

        if (name === 'size') {
          return (
            <TableRowCell key={name} className={styles.size}>
              {formatBytes(size)}
            </TableRowCell>
          );
        }

        if (name === 'dateAdded') {
          return (
            <RelativeDateCellConnector
              key={name}
              className={styles.dateAdded}
              date={dateAdded}
            />
          );
        }

        if (name === 'quality') {
          return (
            <TableRowCell key={name} className={styles.quality}>
              <BookQuality
                quality={quality}
                isCutoffNotMet={qualityCutoffNotMet}
              />
            </TableRowCell>
          );
        }

        if (name === 'actions') {
          return (
            <BookFileActionsCell
              key={name}
              id={id}
              path={path}
              onDeletePress={onDeletePress}
            />
          );
        }

        return null;
      })}
    </TableRow>
  );
}

export default BookFileEditorRow;
