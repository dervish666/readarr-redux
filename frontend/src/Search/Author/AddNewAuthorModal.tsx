import React from 'react';
import Modal from 'Components/Modal/Modal';
import AddNewAuthorModalContent, {
  AddNewAuthorModalContentProps,
} from './AddNewAuthorModalContent';

interface AddNewAuthorModalProps extends AddNewAuthorModalContentProps {
  isOpen: boolean;
}

function AddNewAuthorModal({
  isOpen,
  onModalClose,
  ...otherProps
}: AddNewAuthorModalProps) {
  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      <AddNewAuthorModalContent {...otherProps} onModalClose={onModalClose} />
    </Modal>
  );
}

export default AddNewAuthorModal;
