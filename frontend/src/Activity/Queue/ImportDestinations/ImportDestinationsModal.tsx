import React from 'react';
import Modal from 'Components/Modal/Modal';
import { sizes } from 'Helpers/Props';
import ImportDestinationsModalContent, {
  ImportDestinationsModalContentProps,
} from './ImportDestinationsModalContent';

interface ImportDestinationsModalProps
  extends ImportDestinationsModalContentProps {
  isOpen: boolean;
}

function ImportDestinationsModal({
  isOpen,
  onModalClose,
  ...otherProps
}: ImportDestinationsModalProps) {
  return (
    <Modal isOpen={isOpen} size={sizes.EXTRA_LARGE} onModalClose={onModalClose}>
      {isOpen ? (
        <ImportDestinationsModalContent
          {...otherProps}
          onModalClose={onModalClose}
        />
      ) : null}
    </Modal>
  );
}

export default ImportDestinationsModal;
