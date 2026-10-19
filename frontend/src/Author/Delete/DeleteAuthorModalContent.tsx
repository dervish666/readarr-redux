import React, { useCallback, useState } from 'react';
import { useAuthor, useDeleteAuthor } from 'Author/useAuthors';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import Icon from 'Components/Icon';
import Button from 'Components/Link/Button';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import { icons, inputTypes, kinds } from 'Helpers/Props';
import { InputChanged } from 'typings/inputs';
import formatBytes from 'Utilities/Number/formatBytes';
import translate from 'Utilities/String/translate';
import styles from './DeleteAuthorModalContent.module.css';

export interface DeleteAuthorModalContentProps {
  authorId: number;
  onModalClose: () => void;
}

// DELETE /author/{id}?deleteFiles=&addImportListExclusion=. The modal closes as soon
// as the delete is sent, as the JS one did; the author leaves the caches on success.
function DeleteAuthorModalContent({
  authorId,
  onModalClose,
}: DeleteAuthorModalContentProps) {
  const author = useAuthor(authorId);
  const { deleteAuthor } = useDeleteAuthor();

  const [deleteFiles, setDeleteFiles] = useState(false);
  const [addImportListExclusion, setAddImportListExclusion] = useState(false);

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
    deleteAuthor(authorId, { deleteFiles, addImportListExclusion });

    setDeleteFiles(false);
    setAddImportListExclusion(false);
    onModalClose();
  }, [
    authorId,
    deleteFiles,
    addImportListExclusion,
    deleteAuthor,
    onModalClose,
  ]);

  if (!author) {
    return null;
  }

  const { authorName, path, statistics } = author;
  const { bookFileCount = 0, sizeOnDisk = 0 } = statistics ?? {};

  let deleteFilesLabel = `Delete ${bookFileCount} Book Files`;
  let deleteFilesHelpText = translate('DeleteFilesHelpText');

  if (bookFileCount === 0) {
    deleteFilesLabel = 'Delete Author Folder';
    deleteFilesHelpText = 'Delete the author folder and its contents';
  }

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>
        {translate('Delete')} - {authorName}
      </ModalHeader>

      <ModalBody>
        <div className={styles.pathContainer}>
          <Icon className={styles.pathIcon} name={icons.FOLDER} />

          {path}
        </div>

        <FormGroup>
          <FormLabel>{deleteFilesLabel}</FormLabel>

          <FormInputGroup
            type={inputTypes.CHECK}
            name="deleteFiles"
            value={deleteFiles}
            helpText={deleteFilesHelpText}
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

        {deleteFiles ? (
          <div className={styles.deleteFilesMessage}>
            <div>
              {translate('TheAuthorFolderAndAllOfItsContentWillBeDeleted', {
                0: path,
              })}
            </div>

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

export default DeleteAuthorModalContent;
