import { groupBy, sortBy } from 'lodash';
import React, { useEffect, useMemo, useRef } from 'react';
import Book from 'Book/Book';
import useBookFiles from 'BookFile/useBookFiles';
import Alert from 'Components/Alert';
import Button from 'Components/Link/Button';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import Modal from 'Components/Modal/Modal';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import { kinds } from 'Helpers/Props';
import translate from 'Utilities/String/translate';

interface ConfirmImportModalContentProps {
  books: Book[];
  onConfirmImportPress(): void;
  onModalClose(): void;
}

// Shown before an import that replaces existing files: lists the files on disk for
// the books being imported (GET /bookfile?bookId=). With none, the import goes ahead
// at once. A failed load never imports.
function ConfirmImportModalContent({
  books,
  onConfirmImportPress,
  onModalClose,
}: ConfirmImportModalContentProps) {
  const bookIds = useMemo(() => books.map((book) => book.id), [books]);
  const { data, isFetching, isSuccess, error } = useBookFiles({
    bookId: bookIds,
  });

  const isLoaded = isSuccess && !isFetching;
  const hasNoFiles = isLoaded && !data.length;
  const confirmedRef = useRef(false);

  useEffect(() => {
    if (hasNoFiles && !confirmedRef.current) {
      confirmedRef.current = true;
      onModalClose();
      onConfirmImportPress();
    }
  }, [hasNoFiles, onModalClose, onConfirmImportPress]);

  const filesByBook = useMemo(() => {
    return Object.entries(groupBy(data, 'bookId')).map(([bookId, files]) => {
      return {
        bookId,
        book: books.find((b) => b.id === parseInt(bookId)),
        files: sortBy(files, 'path'),
      };
    });
  }, [data, books]);

  if (hasNoFiles) {
    return null;
  }

  return (
    <ModalContent onModalClose={onModalClose}>
      {isLoaded ? <ModalHeader>{translate('AreYouSure')}</ModalHeader> : null}

      <ModalBody>
        {!isLoaded && !error ? <LoadingIndicator /> : null}

        {error ? (
          <Alert kind={kinds.DANGER}>
            {translate('LoadingBookFilesFailed')}
          </Alert>
        ) : null}

        {isLoaded ? (
          <div>
            <Alert>{translate('ManualImportReplaceExistingWarning')}</Alert>

            {filesByBook.map(({ bookId, book, files }) => {
              return (
                <div key={bookId}>
                  <b> {book?.title} </b>
                  <ul>
                    {files.map((file) => {
                      return <li key={file.id}>{file.path}</li>;
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : null}
      </ModalBody>

      {isLoaded || error ? (
        <ModalFooter>
          <Button onPress={onModalClose}>{translate('Cancel')}</Button>

          {isLoaded ? (
            <Button kind={kinds.DANGER} onPress={onConfirmImportPress}>
              {translate('Proceed')}
            </Button>
          ) : null}
        </ModalFooter>
      ) : null}
    </ModalContent>
  );
}

interface ConfirmImportModalProps extends ConfirmImportModalContentProps {
  isOpen: boolean;
}

function ConfirmImportModal({
  isOpen,
  onModalClose,
  ...otherProps
}: ConfirmImportModalProps) {
  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      <ConfirmImportModalContent {...otherProps} onModalClose={onModalClose} />
    </Modal>
  );
}

export default ConfirmImportModal;
