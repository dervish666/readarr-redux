import React from 'react';
import Modal from 'Components/Modal/Modal';
import { sizes } from 'Helpers/Props';
import EditDownloadClientModalContent, {
  EditDownloadClientModalContentProps,
} from './EditDownloadClientModalContent';

interface EditDownloadClientModalProps
  extends EditDownloadClientModalContentProps {
  isOpen: boolean;
}

// Pending changes live in the content's own store, so closing drops them.
function EditDownloadClientModal({
  isOpen,
  onModalClose,
  ...otherProps
}: EditDownloadClientModalProps) {
  return (
    <Modal size={sizes.MEDIUM} isOpen={isOpen} onModalClose={onModalClose}>
      <EditDownloadClientModalContent
        {...otherProps}
        onModalClose={onModalClose}
      />
    </Modal>
  );
}

export default EditDownloadClientModal;
