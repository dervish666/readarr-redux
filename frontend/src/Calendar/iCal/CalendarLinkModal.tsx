import React from 'react';
import Modal from 'Components/Modal/Modal';
import CalendarLinkModalContent from './CalendarLinkModalContent';

interface CalendarLinkModalProps {
  isOpen: boolean;
  onModalClose: () => void;
}

function CalendarLinkModal({ isOpen, onModalClose }: CalendarLinkModalProps) {
  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      <CalendarLinkModalContent onModalClose={onModalClose} />
    </Modal>
  );
}

export default CalendarLinkModal;
