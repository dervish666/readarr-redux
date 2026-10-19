import React, { useCallback, useState } from 'react';
import Label from 'Components/Label';
import ConfirmModal from 'Components/Modal/ConfirmModal';
import SettingsCard from 'Components/SettingsCard/SettingsCard';
import settingsCardStyles from 'Components/SettingsCard/SettingsCard.module.css';
import SettingsCardStatus, {
  SettingsCardStatusValue,
} from 'Components/SettingsCard/SettingsCardStatus';
import { kinds } from 'Helpers/Props';
import { useDeleteRootFolder } from 'RootFolder/useRootFolders';
import RootFolderModel from 'typings/RootFolder';
import formatBytes from 'Utilities/Number/formatBytes';
import translate from 'Utilities/String/translate';
import EditRootFolderModal from './EditRootFolderModal';
import styles from './RootFolder.module.css';

interface Profile {
  name: string;
}

interface RootFolderProps {
  rootFolder: RootFolderModel;
  qualityProfile?: Profile;
  metadataProfile?: Profile;
}

function RootFolder({
  rootFolder,
  qualityProfile,
  metadataProfile,
}: RootFolderProps) {
  const { id, name, path, accessible, freeSpace } = rootFolder;
  const { deleteRootFolder } = useDeleteRootFolder(id);

  const [isEditRootFolderModalOpen, setIsEditRootFolderModalOpen] =
    useState(false);
  const [isDeleteRootFolderModalOpen, setIsDeleteRootFolderModalOpen] =
    useState(false);

  // A folder the server can't reach reports no free space; say so instead of a blank.
  const hasFreeSpace = accessible && freeSpace != null;

  const handleEditRootFolderPress = useCallback(() => {
    setIsEditRootFolderModalOpen(true);
  }, []);

  const handleEditRootFolderModalClose = useCallback(() => {
    setIsEditRootFolderModalOpen(false);
  }, []);

  const handleDeleteRootFolderPress = useCallback(() => {
    setIsEditRootFolderModalOpen(false);
    setIsDeleteRootFolderModalOpen(true);
  }, []);

  const handleDeleteRootFolderModalClose = useCallback(() => {
    setIsDeleteRootFolderModalOpen(false);
  }, []);

  const handleConfirmDeleteRootFolder = useCallback(() => {
    setIsDeleteRootFolderModalOpen(false);
    deleteRootFolder();
  }, [deleteRootFolder]);

  return (
    <SettingsCard
      name={name}
      aria-label={translate('EditRootFolderName', { name })}
      onPress={handleEditRootFolderPress}
    >
      <div className={styles.path} title={path}>
        {path}
      </div>

      <SettingsCardStatus
        dot={hasFreeSpace ? 'active' : 'muted'}
        segments={[
          translate('FreeSpace'),
          <SettingsCardStatusValue key="freeSpace">
            {hasFreeSpace ? formatBytes(freeSpace) : translate('Unavailable')}
          </SettingsCardStatusValue>,
        ]}
      />

      <div className={settingsCardStyles.labels}>
        <Label kind={qualityProfile ? kinds.SUCCESS : kinds.DANGER}>
          {qualityProfile?.name ?? translate('None')}
        </Label>

        <Label kind={metadataProfile ? kinds.SUCCESS : kinds.DANGER}>
          {metadataProfile?.name ?? translate('None')}
        </Label>
      </div>

      <EditRootFolderModal
        id={id}
        isOpen={isEditRootFolderModalOpen}
        onModalClose={handleEditRootFolderModalClose}
        onDeleteRootFolderPress={handleDeleteRootFolderPress}
      />

      <ConfirmModal
        isOpen={isDeleteRootFolderModalOpen}
        kind={kinds.DANGER}
        title={translate('DeleteRootFolder')}
        message={translate('DeleteRootFolderMessageText', { name })}
        confirmLabel={translate('Delete')}
        onConfirm={handleConfirmDeleteRootFolder}
        onCancel={handleDeleteRootFolderModalClose}
      />
    </SettingsCard>
  );
}

export default RootFolder;
