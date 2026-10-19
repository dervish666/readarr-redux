import React from 'react';
import Modal from 'Components/Modal/Modal';
import DeleteAuthorModalContent from './DeleteAuthorModalContent';

interface DeleteAuthorModalProps {
  isOpen: boolean;
  authorIds: number[];
  onDeleteSelectedPress: (deleteFiles: boolean) => void;
  onModalClose: () => void;
}

function DeleteAuthorModal({
  isOpen,
  authorIds,
  onDeleteSelectedPress,
  onModalClose,
}: DeleteAuthorModalProps) {
  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      {isOpen ? (
        <DeleteAuthorModalContent
          authorIds={authorIds}
          onDeleteSelectedPress={onDeleteSelectedPress}
          onModalClose={onModalClose}
        />
      ) : null}
    </Modal>
  );
}

export default DeleteAuthorModal;
