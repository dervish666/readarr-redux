import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBook, useDeleteBook } from 'Book/useBooks';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import Button from 'Components/Link/Button';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import { inputTypes, kinds } from 'Helpers/Props';
import { InputChanged } from 'typings/inputs';
import formatBytes from 'Utilities/Number/formatBytes';
import translate from 'Utilities/String/translate';
import styles from './DeleteBookModalContent.css';

export interface DeleteBookModalContentProps {
  bookId: number;
  authorSlug: string;
  onModalClose: () => void;
}

// DELETE /book/{id}?deleteFiles=&addImportListExclusion=. As the JS modal did, it
// closes as soon as the delete is sent and goes to the author's page; the book leaves
// the caches on success.
function DeleteBookModalContent({
  bookId,
  authorSlug,
  onModalClose,
}: DeleteBookModalContentProps) {
  const navigate = useNavigate();
  const { book } = useBook(bookId);
  const { deleteBook } = useDeleteBook();

  const [deleteFiles, setDeleteFiles] = useState(false);
  const [addImportListExclusion, setAddImportListExclusion] = useState(true);

  const handleDeleteFilesChange = useCallback(({ value }: InputChanged) => {
    setDeleteFiles(value as boolean);
  }, []);

  const handleAddImportListExclusionChange = useCallback(
    ({ value }: InputChanged) => {
      setAddImportListExclusion(value as boolean);
    },
    []
  );

  const handleDeletePress = useCallback(() => {
    deleteBook(bookId, { deleteFiles, addImportListExclusion });

    setDeleteFiles(false);
    setAddImportListExclusion(false);
    onModalClose();

    navigate(`/author/${authorSlug}`);
  }, [
    bookId,
    authorSlug,
    deleteFiles,
    addImportListExclusion,
    deleteBook,
    onModalClose,
    navigate,
  ]);

  const { bookFileCount = 0, sizeOnDisk = 0 } = book?.statistics ?? {};

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>
        {translate('Delete')} - {book?.title ?? ''}
      </ModalHeader>

      <ModalBody>
        <FormGroup>
          <FormLabel>{`Delete ${bookFileCount} Book Files`}</FormLabel>

          <FormInputGroup
            type={inputTypes.CHECK}
            name="deleteFiles"
            value={deleteFiles}
            helpText="Delete the book files"
            kind={kinds.DANGER}
            onChange={handleDeleteFilesChange}
          />
        </FormGroup>

        <FormGroup>
          <FormLabel>{translate('AddListExclusion')}</FormLabel>

          <FormInputGroup
            type={inputTypes.CHECK}
            name="addImportListExclusion"
            value={addImportListExclusion}
            helpText={translate('AddImportListExclusionHelpText')}
            kind={kinds.DANGER}
            onChange={handleAddImportListExclusionChange}
          />
        </FormGroup>

        {addImportListExclusion ? null : (
          <div className={styles.deleteFilesMessage}>
            <div>
              {translate(
                'IfYouDontAddAnImportListExclusionAndTheAuthorHasAMetadataProfileOtherThanNoneThenThisBookMayBeReaddedDuringTheNextAuthorRefresh'
              )}
            </div>
          </div>
        )}

        {deleteFiles ? (
          <div className={styles.deleteFilesMessage}>
            <div>{translate('TheBooksFilesWillBeDeleted')}</div>

            {bookFileCount ? (
              <div>
                {bookFileCount} book files totaling {formatBytes(sizeOnDisk)}
              </div>
            ) : null}
          </div>
        ) : null}
      </ModalBody>

      <ModalFooter>
        <Button onPress={onModalClose}>{translate('Close')}</Button>

        <Button kind={kinds.DANGER} onPress={handleDeletePress}>
          {translate('Delete')}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}

export default DeleteBookModalContent;
