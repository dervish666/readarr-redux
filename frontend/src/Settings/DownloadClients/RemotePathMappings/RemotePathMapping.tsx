import React, { useCallback, useState } from 'react';
import IconButton from 'Components/Link/IconButton';
import ConfirmModal from 'Components/Modal/ConfirmModal';
import { icons, kinds } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import EditRemotePathMappingModal from './EditRemotePathMappingModal';
import {
  RemotePathMappingModel,
  useDeleteRemotePathMapping,
} from './useRemotePathMappings';
import styles from './RemotePathMapping.module.css';

function RemotePathMapping({
  id,
  host,
  remotePath,
  localPath,
}: RemotePathMappingModel) {
  const { deleteRemotePathMapping, isDeleting } =
    useDeleteRemotePathMapping(id);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleEditPress = useCallback(() => {
    setIsEditModalOpen(true);
  }, []);

  const handleEditModalClose = useCallback(() => {
    setIsEditModalOpen(false);
  }, []);

  const handleDeletePress = useCallback(() => {
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(true);
  }, []);

  const handleDeleteModalClose = useCallback(() => {
    setIsDeleteModalOpen(false);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    // The row unmounts once the mapping leaves the list.
    deleteRemotePathMapping();
  }, [deleteRemotePathMapping]);

  return (
    <div className={styles.remotePathMapping}>
      <div className={styles.host}>{host}</div>
      <div className={styles.path}>{remotePath}</div>
      <div className={styles.path}>{localPath}</div>

      <div className={styles.actions}>
        <IconButton
          name={icons.EDIT}
          title={translate('EditRemotePathMapping')}
          aria-label={translate('EditRemotePathMapping')}
          onPress={handleEditPress}
        />
      </div>

      <EditRemotePathMappingModal
        id={id}
        isOpen={isEditModalOpen}
        onModalClose={handleEditModalClose}
        onDeleteRemotePathMappingPress={handleDeletePress}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        kind={kinds.DANGER}
        title={translate('DeleteRemotePathMapping')}
        message={translate('DeleteRemotePathMappingMessageText')}
        confirmLabel={translate('Delete')}
        isSpinning={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={handleDeleteModalClose}
      />
    </div>
  );
}

export default RemotePathMapping;
