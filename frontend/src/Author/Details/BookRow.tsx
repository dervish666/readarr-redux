import React, { useCallback } from 'react';
import Book from 'Book/Book';
import BookSearchCellConnector from 'Book/BookSearchCellConnector';
import BookTitleLink from 'Book/BookTitleLink';
import IndexerFlags from 'Book/IndexerFlags';
import BookFile from 'BookFile/BookFile';
import Icon from 'Components/Icon';
import MonitorToggleButton from 'Components/MonitorToggleButton';
import StarRating from 'Components/StarRating';
import RelativeDateCellConnector from 'Components/Table/Cells/RelativeDateCellConnector';
import TableRowCell from 'Components/Table/Cells/TableRowCell';
import TableSelectCell from 'Components/Table/Cells/TableSelectCell';
import Column from 'Components/Table/Column';
import TableRow from 'Components/Table/TableRow';
import Popover from 'Components/Tooltip/Popover';
import { icons, kinds, tooltipPositions } from 'Helpers/Props';
import { SelectStateInputProps } from 'typings/props';
import translate from 'Utilities/String/translate';
import BookStatus from './BookStatus';
import styles from './BookRow.css';

export interface MonitorBookOptions {
  shiftKey: boolean;
}

interface BookRowProps {
  book: Book;
  bookFile?: BookFile;
  authorName: string;
  authorMonitored: boolean;
  position?: string;
  columns: Column[];
  isSaving: boolean;
  isEditorActive?: boolean;
  isSelected?: boolean;
  onSelectedChange?: (options: SelectStateInputProps) => void;
  onMonitorBookPress: (
    bookId: number,
    monitored: boolean,
    options: MonitorBookOptions
  ) => void;
}

function BookRow({
  book,
  bookFile,
  authorName,
  authorMonitored,
  position,
  columns,
  isSaving,
  isEditorActive = false,
  isSelected,
  onSelectedChange,
  onMonitorBookPress,
}: BookRowProps) {
  const {
    id,
    authorId,
    monitored,
    releaseDate,
    title,
    seriesTitle,
    pageCount,
    ratings,
    titleSlug,
  } = book;

  const indexerFlags = bookFile?.indexerFlags ?? 0;
  const isAvailable = !!releaseDate && Date.parse(releaseDate) < Date.now();

  const handleMonitorPress = useCallback(
    (value: boolean, options: MonitorBookOptions) => {
      onMonitorBookPress(id, value, options);
    },
    [id, onMonitorBookPress]
  );

  const handleSelectedChange = useCallback(
    (options: SelectStateInputProps) => {
      onSelectedChange?.(options);
    },
    [onSelectedChange]
  );

  return (
    <TableRow>
      {columns.map((column) => {
        const { name, isVisible } = column;

        if (!isVisible) {
          return null;
        }

        if (name === 'select') {
          return isEditorActive ? (
            <TableSelectCell
              key={name}
              id={id}
              isSelected={!!isSelected}
              onSelectedChange={handleSelectedChange}
            />
          ) : null;
        }

        if (name === 'monitored') {
          return (
            <TableRowCell key={name} className={styles.monitored}>
              <MonitorToggleButton
                monitored={monitored}
                isDisabled={!authorMonitored}
                isSaving={isSaving}
                onPress={handleMonitorPress}
              />
            </TableRowCell>
          );
        }

        if (name === 'title') {
          return (
            <TableRowCell key={name} className={styles.title}>
              <BookTitleLink titleSlug={titleSlug} title={title} />
            </TableRowCell>
          );
        }

        if (name === 'series') {
          return (
            <TableRowCell key={name} className={styles.title}>
              {seriesTitle || ''}
            </TableRowCell>
          );
        }

        if (name === 'position') {
          return (
            <TableRowCell key={name} className={styles.position}>
              {position || ''}
            </TableRowCell>
          );
        }

        if (name === 'rating') {
          return (
            <TableRowCell key={name} className={styles.rating}>
              <StarRating rating={ratings.value} votes={ratings.votes} />
            </TableRowCell>
          );
        }

        if (name === 'releaseDate') {
          return (
            <RelativeDateCellConnector
              key={name}
              className={styles.releaseDate}
              date={releaseDate}
            />
          );
        }

        if (name === 'pageCount') {
          return (
            <TableRowCell key={name} className={styles.pageCount}>
              {pageCount || ''}
            </TableRowCell>
          );
        }

        if (name === 'indexerFlags') {
          return (
            <TableRowCell key={name} className={styles.indexerFlags}>
              {indexerFlags ? (
                <Popover
                  anchor={<Icon name={icons.FLAG} kind={kinds.PRIMARY} />}
                  title={translate('IndexerFlags')}
                  body={<IndexerFlags indexerFlags={indexerFlags} />}
                  position={tooltipPositions.LEFT}
                />
              ) : null}
            </TableRowCell>
          );
        }

        if (name === 'status') {
          return (
            <TableRowCell key={name} className={styles.status}>
              <BookStatus
                isAvailable={isAvailable}
                monitored={monitored}
                bookFile={bookFile}
              />
            </TableRowCell>
          );
        }

        if (name === 'actions') {
          return (
            <BookSearchCellConnector
              key={name}
              bookId={id}
              authorId={authorId}
              bookTitle={title}
              authorName={authorName}
            />
          );
        }

        return null;
      })}
    </TableRow>
  );
}

export default BookRow;
