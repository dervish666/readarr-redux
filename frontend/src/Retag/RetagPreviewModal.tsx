import React from 'react';
import Modal from 'Components/Modal/Modal';
import RetagPreviewModalContent from './RetagPreviewModalContent';

interface RetagPreviewModalProps {
  isOpen: boolean;
  authorId: number;
  bookId?: number;
  onModalClose: () => void;
}

function RetagPreviewModal({
  isOpen,
  authorId,
  bookId,
  onModalClose,
}: RetagPreviewModalProps) {
  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      {isOpen ? (
        <RetagPreviewModalContent
          authorId={authorId}
          bookId={bookId}
          onModalClose={onModalClose}
        />
      ) : null}
    </Modal>
  );
}

export default RetagPreviewModal;
