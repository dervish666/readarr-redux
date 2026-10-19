import React from 'react';
import Modal from 'Components/Modal/Modal';
import { sizes } from 'Helpers/Props';
import AuthenticationRequiredModalContent from './AuthenticationRequiredModalContent';

function onModalClose() {
  // No-op: the modal stays until a login is set up.
}

interface AuthenticationRequiredModalProps {
  isOpen: boolean;
}

function AuthenticationRequiredModal({
  isOpen,
}: AuthenticationRequiredModalProps) {
  return (
    <Modal
      size={sizes.MEDIUM}
      isOpen={isOpen}
      closeOnBackgroundClick={false}
      onModalClose={onModalClose}
    >
      <AuthenticationRequiredModalContent />
    </Modal>
  );
}

export default AuthenticationRequiredModal;
