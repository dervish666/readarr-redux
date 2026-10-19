import React from 'react';
import Modal from 'Components/Modal/Modal';
import { sizes } from 'Helpers/Props';
import BookInteractiveSearchModalContent from './BookInteractiveSearchModalContent';

interface BookInteractiveSearchModalProps {
  isOpen: boolean;
  bookId: number;
  bookTitle: string;
  authorName: string;
  onModalClose: () => void;
}

function BookInteractiveSearchModal({
  isOpen,
  bookId,
  bookTitle,
  authorName,
  onModalClose,
}: BookInteractiveSearchModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      size={sizes.EXTRA_EXTRA_LARGE}
      closeOnBackgroundClick={false}
      onModalClose={onModalClose}
    >
      {isOpen ? (
        <BookInteractiveSearchModalContent
          bookId={bookId}
          bookTitle={bookTitle}
          authorName={authorName}
          onModalClose={onModalClose}
        />
      ) : null}
    </Modal>
  );
}

export default BookInteractiveSearchModal;
