import React, { useCallback, useMemo, useState } from 'react';
import useBooks from 'Book/useBooks';
import useBookFiles from 'BookFile/useBookFiles';
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
import translate from 'Utilities/String/translate';
import styles from './DeleteBookModalContent.module.css';

interface DeleteBookModalContentProps {
  bookIds: number[];
  onDeleteSelectedPress: (
    deleteFiles: boolean,
    addImportListExclusion: boolean
  ) => void;
  onModalClose: () => void;
}

// Lists the selected books (GET /book?bookIds=) and, when files are to go too, their
// files (GET /bookfile?bookId=).
function DeleteBookModalContent({
  bookIds,
  onDeleteSelectedPress,
  onModalClose,
}: DeleteBookModalContentProps) {
  const { data: selectedBooks } = useBooks({ bookIds });
  const { data: selectedFiles } = useBookFiles({ bookId: bookIds });

  const [deleteFiles, setDeleteFiles] = useState(false);
  const [addImportListExclusion, setAddImportListExclusion] = useState(true);

  const books = useMemo(() => {
    return [...selectedBooks].sort((a, b) => a.title.localeCompare(b.title));
  }, [selectedBooks]);

  const files = useMemo(() => {
    return [...selectedFiles].sort(
      (a, b) => a.bookId - b.bookId || a.path.localeCompare(b.path)
    );
  }, [selectedFiles]);

  const handleDeleteFilesChange = useCallback(
    ({ value }: InputChanged<boolean>) => {
      setDeleteFiles(value);
    },
    []
  );

  const handleAddImportListExclusionChange = useCallback(
    ({ value }: InputChanged<boolean>) => {
      setAddImportListExclusion(value);
    },
    []
  );

  const handleDeleteBookConfirmed = useCallback(() => {
    setDeleteFiles(false);
    onDeleteSelectedPress(deleteFiles, addImportListExclusion);
  }, [deleteFiles, addImportListExclusion, onDeleteSelectedPress]);

  const plural = books.length > 1 ? 's' : '';

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>Delete Selected Book</ModalHeader>

      <ModalBody>
        <div>
          <FormGroup>
            <FormLabel>{`Delete File${plural}`}</FormLabel>

            <FormInputGroup
              type={inputTypes.CHECK}
              name="deleteFiles"
              value={deleteFiles}
              helpText={translate('DeleteFilesHelpText')}
              kind={kinds.DANGER}
              isDisabled={files.length === 0}
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
        </div>

        <div className={styles.message}>
          {`Are you sure you want to delete ${
            books.length
          } selected book${plural}${deleteFiles ? ' and their files' : ''}?`}
        </div>

        <ul>
          {books.map((book) => (
            <li key={book.id}>
              <span>{book.title}</span>
            </li>
          ))}
        </ul>

        {deleteFiles ? (
          <div>
            <div className={styles.deleteFilesMessage}>
              {translate('TheFollowingFilesWillBeDeleted')}
            </div>
            <ul>
              {files.map((file) => (
                <li key={file.id}>
                  <span>{file.path}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </ModalBody>

      <ModalFooter>
        <Button onPress={onModalClose}>{translate('Cancel')}</Button>

        <Button kind={kinds.DANGER} onPress={handleDeleteBookConfirmed}>
          {translate('Delete')}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}

export default DeleteBookModalContent;
