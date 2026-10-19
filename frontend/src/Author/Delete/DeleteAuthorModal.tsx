import React from 'react';
import Modal from 'Components/Modal/Modal';
import { sizes } from 'Helpers/Props';
import DeleteAuthorModalContent, {
  DeleteAuthorModalContentProps,
} from './DeleteAuthorModalContent';

interface DeleteAuthorModalProps extends DeleteAuthorModalContentProps {
  isOpen: boolean;
}

function DeleteAuthorModal({
  isOpen,
  onModalClose,
  ...otherProps
}: DeleteAuthorModalProps) {
  return (
    <Modal isOpen={isOpen} size={sizes.MEDIUM} onModalClose={onModalClose}>
      <DeleteAuthorModalContent {...otherProps} onModalClose={onModalClose} />
    </Modal>
  );
}

export default DeleteAuthorModal;
