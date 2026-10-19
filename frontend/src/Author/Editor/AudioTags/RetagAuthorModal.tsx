import React from 'react';
import Modal from 'Components/Modal/Modal';
import RetagAuthorModalContent from './RetagAuthorModalContent';

interface RetagAuthorModalProps {
  isOpen: boolean;
  authorIds: number[];
  onModalClose: (retagged?: boolean) => void;
}

function RetagAuthorModal({
  isOpen,
  authorIds,
  onModalClose,
}: RetagAuthorModalProps) {
  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      {isOpen ? (
        <RetagAuthorModalContent
          authorIds={authorIds}
          onModalClose={onModalClose}
        />
      ) : null}
    </Modal>
  );
}

export default RetagAuthorModal;
