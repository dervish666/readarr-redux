import { orderBy } from 'lodash';
import React, { useCallback, useMemo } from 'react';
import Book from 'Book/Book';
import Edition from 'Book/Edition';
import useEditions from 'Book/useEditions';
import Alert from 'Components/Alert';
import SelectInput from 'Components/Form/SelectInput';
import Button from 'Components/Link/Button';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import Modal from 'Components/Modal/Modal';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import TableRowCell from 'Components/Table/Cells/TableRowCell';
import Column from 'Components/Table/Column';
import Table from 'Components/Table/Table';
import TableBody from 'Components/Table/TableBody';
import TableRow from 'Components/Table/TableRow';
import { kinds, scrollDirections } from 'Helpers/Props';
import { InputChanged } from 'typings/inputs';
import titleCase from 'Utilities/String/titleCase';
import translate from 'Utilities/String/translate';
import styles from './SelectEditionModal.module.css';

const COLUMNS: Column[] = [
  {
    name: 'book',
    label: () => translate('Book'),
    isVisible: true,
  },
  {
    name: 'edition',
    label: () => translate('Edition'),
    isVisible: true,
  },
];

export interface SelectEditionBook {
  book: Book;
  matchedEditionId?: string;
}

function getEditionName(edition: Edition) {
  let value = edition.title;

  if (edition.disambiguation) {
    value = `${value} (${titleCase(edition.disambiguation)})`;
  }

  const extras = [];

  if (edition.language) {
    extras.push(edition.language);
  }

  if (edition.publisher) {
    extras.push(edition.publisher);
  }

  if (edition.isbn13) {
    extras.push(edition.isbn13);
  }

  if (edition.asin) {
    extras.push(edition.asin);
  }

  if (edition.format) {
    extras.push(edition.format);
  }

  if (edition.pageCount > 0) {
    extras.push(`${edition.pageCount}p`);
  }

  return `${value} [${extras.join(', ')}]`;
}

interface SelectEditionRowProps {
  book: Book;
  matchedEditionId?: string;
  editions: Edition[];
  onEditionSelect(bookId: number, foreignEditionId: string): void;
}

function SelectEditionRow({
  book,
  matchedEditionId,
  editions,
  onEditionSelect,
}: SelectEditionRowProps) {
  const { id, title, disambiguation } = book;

  const values = useMemo(() => {
    return orderBy(
      editions.map((edition) => ({
        key: edition.foreignEditionId,
        value: getEditionName(edition),
      })),
      ['value']
    );
  }, [editions]);

  const handleChange = useCallback(
    ({ value }: InputChanged<string>) => {
      onEditionSelect(id, value);
    },
    [id, onEditionSelect]
  );

  return (
    <TableRow>
      <TableRowCell>
        {disambiguation ? `${title} (${disambiguation})` : title}
      </TableRowCell>

      <TableRowCell>
        <SelectInput
          name={String(id)}
          value={matchedEditionId ?? ''}
          values={values}
          onChange={handleChange}
        />
      </TableRowCell>
    </TableRow>
  );
}

interface SelectEditionModalContentProps {
  books: SelectEditionBook[];
  modalTitle: string;
  onEditionSelect(bookId: number, foreignEditionId: string): void;
  onModalClose(): void;
}

// One row per book in the import, each with the book's editions from GET /edition.
function SelectEditionModalContent({
  books,
  modalTitle,
  onEditionSelect,
  onModalClose,
}: SelectEditionModalContentProps) {
  const bookIds = useMemo(() => books.map(({ book }) => book.id), [books]);
  const { data: editions, isFetched, error } = useEditions(bookIds);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>
        {modalTitle} - {translate('SelectEdition')}
      </ModalHeader>

      <ModalBody
        className={styles.modalBody}
        scrollDirection={scrollDirections.VERTICAL}
      >
        {!isFetched && !error ? <LoadingIndicator /> : null}

        {error ? (
          <Alert kind={kinds.DANGER}>
            {translate('LoadingEditionsFailed')}
          </Alert>
        ) : null}

        {isFetched && !error ? (
          <>
            <Alert>{translate('ManualImportEditionOverrideWarning')}</Alert>

            <Table columns={COLUMNS}>
              <TableBody>
                {books.map(({ book, matchedEditionId }) => {
                  return (
                    <SelectEditionRow
                      key={book.id}
                      book={book}
                      matchedEditionId={matchedEditionId}
                      editions={editions.filter((e) => e.bookId === book.id)}
                      onEditionSelect={onEditionSelect}
                    />
                  );
                })}
              </TableBody>
            </Table>
          </>
        ) : null}
      </ModalBody>

      <ModalFooter>
        <Button onPress={onModalClose}>{translate('Cancel')}</Button>
      </ModalFooter>
    </ModalContent>
  );
}

interface SelectEditionModalProps extends SelectEditionModalContentProps {
  isOpen: boolean;
}

function SelectEditionModal({
  isOpen,
  onModalClose,
  ...otherProps
}: SelectEditionModalProps) {
  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      <SelectEditionModalContent {...otherProps} onModalClose={onModalClose} />
    </Modal>
  );
}

export default SelectEditionModal;
