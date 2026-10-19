import React from 'react';
import Modal from 'Components/Modal/Modal';
import { sizes } from 'Helpers/Props';
import EditImportListModalContent, {
  EditImportListModalContentProps,
} from './EditImportListModalContent';

interface EditImportListModalProps extends EditImportListModalContentProps {
  isOpen: boolean;
}

// Pending changes live in the content's own store, so closing drops them.
function EditImportListModal({
  isOpen,
  onModalClose,
  ...otherProps
}: EditImportListModalProps) {
  return (
    <Modal size={sizes.MEDIUM} isOpen={isOpen} onModalClose={onModalClose}>
      <EditImportListModalContent {...otherProps} onModalClose={onModalClose} />
    </Modal>
  );
}

export default EditImportListModal;
