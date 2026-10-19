import React, { useCallback, useMemo, useState } from 'react';
import Book from 'Book/Book';
import { useAuthorBooks } from 'Book/useBooks';
import TextInput from 'Components/Form/TextInput';
import Label from 'Components/Label';
import Button from 'Components/Link/Button';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import Modal from 'Components/Modal/Modal';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import Scroller from 'Components/Scroller/Scroller';
import RelativeDateCellConnector from 'Components/Table/Cells/RelativeDateCellConnector';
import TableRowCell from 'Components/Table/Cells/TableRowCell';
import Column from 'Components/Table/Column';
import Table from 'Components/Table/Table';
import TableBody from 'Components/Table/TableBody';
import TableRowButton from 'Components/Table/TableRowButton';
import { kinds, scrollDirections, sizes } from 'Helpers/Props';
import SortDirection from 'Helpers/Props/SortDirection';
import { InputChanged } from 'typings/inputs';
import { sortItems } from 'Utilities/Filter/clientSideFilterAndSort';
import translate from 'Utilities/String/translate';
import styles from './SelectBookModal.module.css';

const COLUMNS: Column[] = [
  {
    name: 'title',
    label: () => translate('BookTitle'),
    isSortable: true,
    isVisible: true,
  },
  {
    name: 'releaseDate',
    label: () => translate('ReleaseDate'),
    isSortable: true,
    isVisible: true,
  },
  {
    name: 'status',
    label: () => translate('BookStatus'),
    isVisible: true,
  },
];

function getBookCountKind(
  monitored: boolean,
  bookFileCount: number,
  bookCount: number
) {
  if (bookFileCount === bookCount && bookCount > 0) {
    return kinds.SUCCESS;
  }

  if (!monitored) {
    return kinds.WARNING;
  }

  return kinds.DANGER;
}

interface SelectBookRowProps {
  book: Book;
  onBookSelect(book: Book): void;
}

function SelectBookRow({ book, onBookSelect }: SelectBookRowProps) {
  const { title, releaseDate, monitored, statistics } = book;
  const bookCount = statistics?.bookCount ?? 0;
  const bookFileCount = statistics?.bookFileCount ?? 0;
  const totalBookCount = statistics?.totalBookCount ?? 0;

  const handlePress = useCallback(() => {
    onBookSelect(book);
  }, [book, onBookSelect]);

  return (
    <TableRowButton onPress={handlePress}>
      <TableRowCell>{title}</TableRowCell>

      <RelativeDateCellConnector date={releaseDate} />

      <TableRowCell>
        <Label
          title={translate(
            'TotalBookCountBooksTotalBookFileCountBooksWithFilesInterp',
            { totalBookCount, bookFileCount }
          )}
          kind={getBookCountKind(monitored, bookFileCount, bookCount)}
          size={sizes.MEDIUM}
        >
          <span>
            {bookFileCount} / {bookCount}
          </span>
        </Label>
      </TableRowCell>
    </TableRowButton>
  );
}

interface SelectBookModalContentProps {
  authorId?: number;
  modalTitle: string;
  onBookSelect(book: Book): void;
  onModalClose(): void;
}

// The author's books from GET /book?authorId=, sorted and filtered here.
function SelectBookModalContent({
  authorId,
  modalTitle,
  onBookSelect,
  onModalClose,
}: SelectBookModalContentProps) {
  const { data: books, isFetching } = useAuthorBooks(authorId);
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState('title');
  const [sortDirection, setSortDirection] = useState(SortDirection.Ascending);

  const items = useMemo(() => {
    const filterLower = filter.toLowerCase();

    return sortItems(
      books.filter((book) => book.title.toLowerCase().includes(filterLower)),
      { sortKey, sortDirection }
    );
  }, [books, filter, sortKey, sortDirection]);

  const handleFilterChange = useCallback(({ value }: InputChanged<string>) => {
    setFilter(value);
  }, []);

  const handleSortPress = useCallback(
    (newSortKey: string, newSortDirection?: SortDirection) => {
      if (newSortDirection) {
        setSortDirection(newSortDirection);
      } else if (newSortKey === sortKey) {
        setSortDirection(
          sortDirection === SortDirection.Ascending
            ? SortDirection.Descending
            : SortDirection.Ascending
        );
      }

      setSortKey(newSortKey);
    },
    [sortKey, sortDirection]
  );

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>
        {modalTitle} - {translate('SelectBook')}
      </ModalHeader>

      <ModalBody
        className={styles.modalBody}
        scrollDirection={scrollDirections.NONE}
      >
        {isFetching ? <LoadingIndicator /> : null}

        <TextInput
          className={styles.filterInput}
          placeholder={translate('FilterPlaceHolder')}
          name="filter"
          value={filter}
          autoFocus={true}
          onChange={handleFilterChange}
        />

        <Scroller className={styles.scroller}>
          <Table
            columns={COLUMNS}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortPress={handleSortPress}
          >
            <TableBody>
              {items.map((book) => {
                return (
                  <SelectBookRow
                    key={book.id}
                    book={book}
                    onBookSelect={onBookSelect}
                  />
                );
              })}
            </TableBody>
          </Table>
        </Scroller>
      </ModalBody>

      <ModalFooter>
        <Button onPress={onModalClose}>{translate('Cancel')}</Button>
      </ModalFooter>
    </ModalContent>
  );
}

interface SelectBookModalProps extends SelectBookModalContentProps {
  isOpen: boolean;
}

function SelectBookModal({
  isOpen,
  onModalClose,
  ...otherProps
}: SelectBookModalProps) {
  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      <SelectBookModalContent {...otherProps} onModalClose={onModalClose} />
    </Modal>
  );
}

export default SelectBookModal;
