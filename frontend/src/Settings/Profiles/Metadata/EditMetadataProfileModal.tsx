import React from 'react';
import Modal from 'Components/Modal/Modal';
import { sizes } from 'Helpers/Props';
import EditMetadataProfileModalContent from './EditMetadataProfileModalContent';

interface EditMetadataProfileModalProps {
  id?: number;
  cloneId?: number;
  isOpen: boolean;
  onModalClose: () => void;
  onDeleteMetadataProfilePress?: () => void;
}

function EditMetadataProfileModal({
  isOpen,
  onModalClose,
  ...otherProps
}: EditMetadataProfileModalProps) {
  return (
    <Modal size={sizes.MEDIUM} isOpen={isOpen} onModalClose={onModalClose}>
      <EditMetadataProfileModalContent
        {...otherProps}
        onModalClose={onModalClose}
      />
    </Modal>
  );
}

export default EditMetadataProfileModal;
