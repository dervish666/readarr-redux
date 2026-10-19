import React from 'react';
import Modal from 'Components/Modal/Modal';
import DeleteBookModalContent from './DeleteBookModalContent';

interface DeleteBookModalProps {
  isOpen: boolean;
  bookIds: number[];
  onDeleteSelectedPress: (
    deleteFiles: boolean,
    addImportListExclusion: boolean
  ) => void;
  onModalClose: () => void;
}

function DeleteBookModal({
  isOpen,
  bookIds,
  onDeleteSelectedPress,
  onModalClose,
}: DeleteBookModalProps) {
  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      {isOpen ? (
        <DeleteBookModalContent
          bookIds={bookIds}
          onDeleteSelectedPress={onDeleteSelectedPress}
          onModalClose={onModalClose}
        />
      ) : null}
    </Modal>
  );
}

export default DeleteBookModal;
