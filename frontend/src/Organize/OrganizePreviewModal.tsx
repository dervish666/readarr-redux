import React from 'react';
import Modal from 'Components/Modal/Modal';
import OrganizePreviewModalContent from './OrganizePreviewModalContent';

interface OrganizePreviewModalProps {
  isOpen: boolean;
  authorId: number;
  bookId?: number;
  onModalClose: () => void;
}

function OrganizePreviewModal({
  isOpen,
  authorId,
  bookId,
  onModalClose,
}: OrganizePreviewModalProps) {
  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      {isOpen ? (
        <OrganizePreviewModalContent
          authorId={authorId}
          bookId={bookId}
          onModalClose={onModalClose}
        />
      ) : null}
    </Modal>
  );
}

export default OrganizePreviewModal;
