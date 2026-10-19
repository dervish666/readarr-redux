import React from 'react';
import Modal from 'Components/Modal/Modal';
import AddIndexerModalContent, {
  AddIndexerModalContentProps,
} from './AddIndexerModalContent';

interface AddIndexerModalProps extends AddIndexerModalContentProps {
  isOpen: boolean;
}

function AddIndexerModal({
  isOpen,
  onModalClose,
  ...otherProps
}: AddIndexerModalProps) {
  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      <AddIndexerModalContent {...otherProps} onModalClose={onModalClose} />
    </Modal>
  );
}

export default AddIndexerModal;
