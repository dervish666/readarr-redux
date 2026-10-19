import React from 'react';
import Modal from 'Components/Modal/Modal';
import OrganizeAuthorModalContent from './OrganizeAuthorModalContent';

interface OrganizeAuthorModalProps {
  isOpen: boolean;
  authorIds: number[];
  onModalClose: (organized?: boolean) => void;
}

function OrganizeAuthorModal({
  isOpen,
  authorIds,
  onModalClose,
}: OrganizeAuthorModalProps) {
  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      {isOpen ? (
        <OrganizeAuthorModalContent
          authorIds={authorIds}
          onModalClose={onModalClose}
        />
      ) : null}
    </Modal>
  );
}

export default OrganizeAuthorModal;
