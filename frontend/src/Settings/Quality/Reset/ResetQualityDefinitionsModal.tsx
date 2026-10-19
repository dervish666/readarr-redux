import React from 'react';
import Modal from 'Components/Modal/Modal';
import { sizes } from 'Helpers/Props';
import ResetQualityDefinitionsModalContent, {
  ResetQualityDefinitionsModalContentProps,
} from './ResetQualityDefinitionsModalContent';

interface ResetQualityDefinitionsModalProps
  extends ResetQualityDefinitionsModalContentProps {
  isOpen: boolean;
}

function ResetQualityDefinitionsModal({
  isOpen,
  onModalClose,
  ...otherProps
}: ResetQualityDefinitionsModalProps) {
  return (
    <Modal isOpen={isOpen} size={sizes.MEDIUM} onModalClose={onModalClose}>
      <ResetQualityDefinitionsModalContent
        {...otherProps}
        onModalClose={onModalClose}
      />
    </Modal>
  );
}

export default ResetQualityDefinitionsModal;
