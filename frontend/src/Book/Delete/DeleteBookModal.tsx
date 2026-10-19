import React from 'react';
import Modal from 'Components/Modal/Modal';
import { sizes } from 'Helpers/Props';
import DeleteBookModalContent, {
  DeleteBookModalContentProps,
} from './DeleteBookModalContent';

interface DeleteBookModalProps extends DeleteBookModalContentProps {
  isOpen: boolean;
}

function DeleteBookModal({
  isOpen,
  onModalClose,
  ...otherProps
}: DeleteBookModalProps) {
  return (
    <Modal isOpen={isOpen} size={sizes.MEDIUM} onModalClose={onModalClose}>
      <DeleteBookModalContent {...otherProps} onModalClose={onModalClose} />
    </Modal>
  );
}

export default DeleteBookModal;
