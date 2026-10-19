import React from 'react';
import Modal from 'Components/Modal/Modal';
import AddNewBookModalContent, {
  AddNewBookModalContentProps,
} from './AddNewBookModalContent';

interface AddNewBookModalProps extends AddNewBookModalContentProps {
  isOpen: boolean;
}

function AddNewBookModal({
  isOpen,
  onModalClose,
  ...otherProps
}: AddNewBookModalProps) {
  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      <AddNewBookModalContent {...otherProps} onModalClose={onModalClose} />
    </Modal>
  );
}

export default AddNewBookModal;
