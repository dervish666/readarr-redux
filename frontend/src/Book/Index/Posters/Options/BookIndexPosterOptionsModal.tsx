import React from 'react';
import Modal from 'Components/Modal/Modal';
import BookIndexPosterOptionsModalContent from './BookIndexPosterOptionsModalContent';

interface BookIndexPosterOptionsModalProps {
  isOpen: boolean;
  onModalClose(): void;
}

function BookIndexPosterOptionsModal({
  isOpen,
  onModalClose,
}: BookIndexPosterOptionsModalProps) {
  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      <BookIndexPosterOptionsModalContent onModalClose={onModalClose} />
    </Modal>
  );
}

export default BookIndexPosterOptionsModal;
