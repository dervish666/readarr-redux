import React from 'react';
import Modal from 'Components/Modal/Modal';
import EditBookModalContent, {
  EditBookModalContentProps,
} from './EditBookModalContent';

interface EditBookModalProps extends EditBookModalContentProps {
  isOpen: boolean;
}

function EditBookModal({
  isOpen,
  onModalClose,
  ...otherProps
}: EditBookModalProps) {
  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      <EditBookModalContent {...otherProps} onModalClose={onModalClose} />
    </Modal>
  );
}

export default EditBookModal;
