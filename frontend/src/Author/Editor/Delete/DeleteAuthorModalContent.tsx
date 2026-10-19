import React, { useCallback, useMemo, useState } from 'react';
import Author from 'Author/Author';
import useAuthors from 'Author/useAuthors';
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
import styles from './DeleteAuthorModalContent.module.css';

interface DeleteAuthorModalContentProps {
  authorIds: number[];
  onDeleteSelectedPress: (deleteFiles: boolean) => void;
  onModalClose: () => void;
}

function DeleteAuthorModalContent({
  authorIds,
  onDeleteSelectedPress,
  onModalClose,
}: DeleteAuthorModalContentProps) {
  const { authorsMap } = useAuthors();
  const [deleteFiles, setDeleteFiles] = useState(false);

  const authors = useMemo(() => {
    return authorIds
      .map((id) => authorsMap.get(id))
      .filter((author): author is Author => !!author)
      .sort((a, b) => a.sortName.localeCompare(b.sortName));
  }, [authorIds, authorsMap]);

  const plural = authors.length > 1 ? 's' : '';

  const handleDeleteFilesChange = useCallback(
    ({ value }: InputChanged<boolean>) => {
      setDeleteFiles(value);
    },
    []
  );

  const handleDeleteAuthorConfirmed = useCallback(() => {
    setDeleteFiles(false);
    onDeleteSelectedPress(deleteFiles);
  }, [deleteFiles, onDeleteSelectedPress]);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>Delete Selected Author</ModalHeader>

      <ModalBody>
        <div>
          <FormGroup>
            <FormLabel>{`Delete Author Folder${plural}`}</FormLabel>

            <FormInputGroup
              type={inputTypes.CHECK}
              name="deleteFiles"
              value={deleteFiles}
              helpText={`Delete Author Folder${plural} and all contents`}
              kind={kinds.DANGER}
              onChange={handleDeleteFilesChange}
            />
          </FormGroup>
        </div>

        <div className={styles.message}>
          {`Are you sure you want to delete ${
            authors.length
          } selected author${plural}${deleteFiles ? ' and all contents' : ''}?`}
        </div>

        <ul>
          {authors.map((author) => (
            <li key={author.id}>
              <span>{author.authorName}</span>

              {deleteFiles ? (
                <span className={styles.pathContainer}>
                  -<span className={styles.path}>{author.path}</span>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </ModalBody>

      <ModalFooter>
        <Button onPress={onModalClose}>{translate('Cancel')}</Button>

        <Button kind={kinds.DANGER} onPress={handleDeleteAuthorConfirmed}>
          {translate('Delete')}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}

export default DeleteAuthorModalContent;
