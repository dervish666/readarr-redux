import React, { useCallback, useState } from 'react';
import IconButton from 'Components/Link/IconButton';
import ConfirmModal from 'Components/Modal/ConfirmModal';
import { icons, kinds } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import EditImportListExclusionModal from './EditImportListExclusionModal';
import {
  ImportListExclusionModel,
  useDeleteImportListExclusion,
} from './useImportListExclusions';
import styles from './ImportListExclusion.css';

function ImportListExclusion({
  id,
  authorName,
  foreignId,
}: ImportListExclusionModel) {
  const { deleteImportListExclusion, isDeleting } =
    useDeleteImportListExclusion(id);

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
    // The row unmounts once the exclusion leaves the list.
    deleteImportListExclusion();
  }, [deleteImportListExclusion]);

  return (
    <div className={styles.importListExclusion}>
      <div className={styles.name}>{authorName}</div>
      <div className={styles.foreignId}>{foreignId}</div>

      <div className={styles.actions}>
        <IconButton
          name={icons.EDIT}
          title={translate('EditImportListExclusion')}
          aria-label={translate('EditImportListExclusion')}
          onPress={handleEditPress}
        />
      </div>

      <EditImportListExclusionModal
        id={id}
        isOpen={isEditModalOpen}
        onModalClose={handleEditModalClose}
        onDeleteImportListExclusionPress={handleDeletePress}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        kind={kinds.DANGER}
        title={translate('DeleteImportListExclusion')}
        message={translate('DeleteImportListExclusionMessageText')}
        confirmLabel={translate('Delete')}
        isSpinning={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={handleDeleteModalClose}
      />
    </div>
  );
}

export default ImportListExclusion;
