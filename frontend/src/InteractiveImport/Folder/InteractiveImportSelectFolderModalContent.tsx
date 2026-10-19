import React, { useCallback, useState } from 'react';
import * as commandNames from 'Commands/commandNames';
import { useExecuteCommand } from 'Commands/useCommands';
import PathInput from 'Components/Form/PathInput';
import Icon from 'Components/Icon';
import Button from 'Components/Link/Button';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import Column from 'Components/Table/Column';
import Table from 'Components/Table/Table';
import TableBody from 'Components/Table/TableBody';
import { icons, kinds, sizes } from 'Helpers/Props';
import {
  addRecentFolder,
  useRecentFolders,
} from 'InteractiveImport/interactiveImportFoldersStore';
import translate from 'Utilities/String/translate';
import RecentFolderRow from './RecentFolderRow';
import styles from './InteractiveImportSelectFolderModalContent.module.css';

const recentFoldersColumns: Column[] = [
  {
    name: 'folder',
    label: () => translate('Folder'),
    isVisible: true,
  },
  {
    name: 'lastUsed',
    label: () => translate('LastUsed'),
    isVisible: true,
  },
  {
    name: 'actions',
    label: '',
    isVisible: true,
  },
];

interface InteractiveImportSelectFolderModalContentProps {
  modalTitle: string;
  onFolderSelect(folder: string): void;
  onModalClose(): void;
}

// Pick a folder for manual import: Move Automatically runs DownloadedBooksScan on it,
// Interactive Import lists its files. Both remember the folder.
function InteractiveImportSelectFolderModalContent({
  modalTitle,
  onFolderSelect,
  onModalClose,
}: InteractiveImportSelectFolderModalContentProps) {
  const [folder, setFolder] = useState('');
  const recentFolders = useRecentFolders();
  const executeCommand = useExecuteCommand();

  const handlePathChange = useCallback(({ value }: { value: string }) => {
    setFolder(value);
  }, []);

  const handleQuickImportPress = useCallback(() => {
    addRecentFolder(folder);

    executeCommand({
      name: commandNames.DOWNLOADED_BOOKS_SCAN,
      path: folder,
    });

    onModalClose();
  }, [folder, executeCommand, onModalClose]);

  const handleInteractiveImportPress = useCallback(() => {
    addRecentFolder(folder);
    onFolderSelect(folder);
  }, [folder, onFolderSelect]);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>
        {modalTitle} - {translate('SelectFolder')}
      </ModalHeader>

      <ModalBody>
        <PathInput name="folder" value={folder} onChange={handlePathChange} />

        {recentFolders.length ? (
          <div className={styles.recentFoldersContainer}>
            <Table columns={recentFoldersColumns}>
              <TableBody>
                {recentFolders
                  .slice(0)
                  .reverse()
                  .map((recentFolder) => {
                    return (
                      <RecentFolderRow
                        key={recentFolder.folder}
                        folder={recentFolder.folder}
                        lastUsed={recentFolder.lastUsed}
                        onPress={setFolder}
                      />
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        ) : null}

        <div className={styles.buttonsContainer}>
          <div className={styles.buttonContainer}>
            <Button
              className={styles.button}
              kind={kinds.PRIMARY}
              size={sizes.LARGE}
              isDisabled={!folder}
              onPress={handleQuickImportPress}
            >
              <Icon className={styles.buttonIcon} name={icons.QUICK} />
              {translate('MoveAutomatically')}
            </Button>
          </div>

          <div className={styles.buttonContainer}>
            <Button
              className={styles.button}
              kind={kinds.PRIMARY}
              size={sizes.LARGE}
              isDisabled={!folder}
              onPress={handleInteractiveImportPress}
            >
              <Icon className={styles.buttonIcon} name={icons.INTERACTIVE} />
              {translate('InteractiveImport')}
            </Button>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button onPress={onModalClose}>{translate('Cancel')}</Button>
      </ModalFooter>
    </ModalContent>
  );
}

export default InteractiveImportSelectFolderModalContent;
