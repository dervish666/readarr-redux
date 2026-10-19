import React from 'react';
import Modal from 'Components/Modal/Modal';
import BookIndexOverviewOptionsModalContent from './BookIndexOverviewOptionsModalContent';

interface BookIndexOverviewOptionsModalProps {
  isOpen: boolean;
  onModalClose(): void;
}

function BookIndexOverviewOptionsModal({
  isOpen,
  onModalClose,
}: BookIndexOverviewOptionsModalProps) {
  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      <BookIndexOverviewOptionsModalContent onModalClose={onModalClose} />
    </Modal>
  );
}

export default BookIndexOverviewOptionsModal;
