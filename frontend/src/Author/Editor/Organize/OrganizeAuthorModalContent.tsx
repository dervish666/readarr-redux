import React, { useCallback } from 'react';
import useSelectedAuthorNames from 'Author/Editor/useSelectedAuthorNames';
import * as commandNames from 'Commands/commandNames';
import { useExecuteCommand } from 'Commands/useCommands';
import Alert from 'Components/Alert';
import Icon from 'Components/Icon';
import Button from 'Components/Link/Button';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import { icons, kinds } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import styles from './OrganizeAuthorModalContent.css';

interface OrganizeAuthorModalContentProps {
  authorIds: number[];
  onModalClose: (organized?: boolean) => void;
}

function OrganizeAuthorModalContent({
  authorIds,
  onModalClose,
}: OrganizeAuthorModalContentProps) {
  const executeCommand = useExecuteCommand();
  const authorNames = useSelectedAuthorNames(authorIds);

  const handleModalClose = useCallback(() => onModalClose(), [onModalClose]);

  const handleOrganizeAuthorPress = useCallback(() => {
    executeCommand({
      name: commandNames.RENAME_AUTHOR,
      authorIds,
    });

    onModalClose(true);
  }, [authorIds, executeCommand, onModalClose]);

  return (
    <ModalContent onModalClose={handleModalClose}>
      <ModalHeader>Organize Selected Author</ModalHeader>

      <ModalBody>
        <Alert>
          Tip: To preview a rename, select "Cancel", then select any author name
          and use the
          <Icon className={styles.renameIcon} name={icons.ORGANIZE} />
        </Alert>

        <div className={styles.message}>
          Are you sure you want to organize all files in the{' '}
          {authorNames.length} selected author?
        </div>

        <ul>
          {authorNames.map((authorName) => (
            <li key={authorName}>{authorName}</li>
          ))}
        </ul>
      </ModalBody>

      <ModalFooter>
        <Button onPress={handleModalClose}>{translate('Cancel')}</Button>

        <Button kind={kinds.DANGER} onPress={handleOrganizeAuthorPress}>
          {translate('Organize')}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}

export default OrganizeAuthorModalContent;
