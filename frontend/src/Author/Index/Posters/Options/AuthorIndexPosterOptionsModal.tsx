import React from 'react';
import Modal from 'Components/Modal/Modal';
import AuthorIndexPosterOptionsModalContent from './AuthorIndexPosterOptionsModalContent';

interface AuthorIndexPosterOptionsModalProps {
  isOpen: boolean;
  onModalClose(): void;
}

function AuthorIndexPosterOptionsModal({
  isOpen,
  onModalClose,
}: AuthorIndexPosterOptionsModalProps) {
  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      <AuthorIndexPosterOptionsModalContent onModalClose={onModalClose} />
    </Modal>
  );
}

export default AuthorIndexPosterOptionsModal;
