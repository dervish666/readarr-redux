import React from 'react';
import Modal from 'Components/Modal/Modal';
import EditRootFolderModalContent, {
  EditRootFolderModalContentProps,
} from './EditRootFolderModalContent';

interface EditRootFolderModalProps extends EditRootFolderModalContentProps {
  isOpen: boolean;
}

function EditRootFolderModal({
  isOpen,
  onModalClose,
  ...otherProps
}: EditRootFolderModalProps) {
  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      <EditRootFolderModalContent {...otherProps} onModalClose={onModalClose} />
    </Modal>
  );
}

export default EditRootFolderModal;
