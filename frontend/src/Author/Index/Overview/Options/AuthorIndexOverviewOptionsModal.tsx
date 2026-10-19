import React from 'react';
import Modal from 'Components/Modal/Modal';
import AuthorIndexOverviewOptionsModalContent from './AuthorIndexOverviewOptionsModalContent';

interface AuthorIndexOverviewOptionsModalProps {
  isOpen: boolean;
  onModalClose(): void;
}

function AuthorIndexOverviewOptionsModal({
  isOpen,
  onModalClose,
}: AuthorIndexOverviewOptionsModalProps) {
  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      <AuthorIndexOverviewOptionsModalContent onModalClose={onModalClose} />
    </Modal>
  );
}

export default AuthorIndexOverviewOptionsModal;
