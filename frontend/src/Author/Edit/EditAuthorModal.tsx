import React from 'react';
import Modal from 'Components/Modal/Modal';
import EditAuthorModalContent, {
  EditAuthorModalContentProps,
} from './EditAuthorModalContent';

interface EditAuthorModalProps extends EditAuthorModalContentProps {
  isOpen: boolean;
}

// Pending changes live in the content, so closing the modal drops them.
function EditAuthorModal({
  isOpen,
  onModalClose,
  ...otherProps
}: EditAuthorModalProps) {
  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      <EditAuthorModalContent {...otherProps} onModalClose={onModalClose} />
    </Modal>
  );
}

export default EditAuthorModal;
