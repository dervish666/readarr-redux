import React, { useCallback, useState } from 'react';
import useSelectedAuthorNames from 'Author/Editor/useSelectedAuthorNames';
import * as commandNames from 'Commands/commandNames';
import { useExecuteCommand } from 'Commands/useCommands';
import Alert from 'Components/Alert';
import CheckInput from 'Components/Form/CheckInput';
import Icon from 'Components/Icon';
import Button from 'Components/Link/Button';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import { icons, kinds } from 'Helpers/Props';
import { InputChanged } from 'typings/inputs';
import translate from 'Utilities/String/translate';
import styles from './RetagAuthorModalContent.module.css';

interface RetagAuthorModalContentProps {
  authorIds: number[];
  onModalClose: (retagged?: boolean) => void;
}

function RetagAuthorModalContent({
  authorIds,
  onModalClose,
}: RetagAuthorModalContentProps) {
  const executeCommand = useExecuteCommand();
  const authorNames = useSelectedAuthorNames(authorIds);

  const [updateCovers, setUpdateCovers] = useState(false);
  const [embedMetadata, setEmbedMetadata] = useState(false);

  const handleModalClose = useCallback(() => onModalClose(), [onModalClose]);

  const handleCheckInputChange = useCallback(
    ({ name, value }: InputChanged<boolean>) => {
      if (name === 'updateCovers') {
        setUpdateCovers(value);
      } else {
        setEmbedMetadata(value);
      }
    },
    []
  );

  const handleRetagAuthorPress = useCallback(() => {
    executeCommand({
      name: commandNames.RETAG_AUTHOR,
      authorIds,
      updateCovers,
      embedMetadata,
    });

    onModalClose(true);
  }, [authorIds, updateCovers, embedMetadata, executeCommand, onModalClose]);

  return (
    <ModalContent onModalClose={handleModalClose}>
      <ModalHeader>Retag Selected Author</ModalHeader>

      <ModalBody>
        <Alert>
          Tip: To preview the tags that will be written... select "Cancel" then
          click any author name and use the
          <Icon className={styles.retagIcon} name={icons.RETAG} />
        </Alert>

        <div className={styles.message}>
          Are you sure you want to re-tag all files in the {authorNames.length}{' '}
          selected author?
        </div>

        <ul>
          {authorNames.map((authorName) => (
            <li key={authorName}>{authorName}</li>
          ))}
        </ul>
      </ModalBody>

      <ModalFooter>
        <label className={styles.searchForNewBookLabelContainer}>
          <span className={styles.searchForNewBookLabel}>
            {translate('UpdateCovers')}
          </span>

          <CheckInput
            containerClassName={styles.searchForNewBookContainer}
            className={styles.searchForNewBookInput}
            name="updateCovers"
            value={updateCovers}
            onChange={handleCheckInputChange}
          />
        </label>

        <label className={styles.searchForNewBookLabelContainer}>
          <span className={styles.searchForNewBookLabel}>
            {translate('EmbedMetadata')}
          </span>

          <CheckInput
            containerClassName={styles.searchForNewBookContainer}
            className={styles.searchForNewBookInput}
            name="embedMetadata"
            value={embedMetadata}
            onChange={handleCheckInputChange}
          />
        </label>

        <Button onPress={handleModalClose}>{translate('Cancel')}</Button>

        <Button kind={kinds.DANGER} onPress={handleRetagAuthorPress}>
          {translate('Retag')}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}

export default RetagAuthorModalContent;
