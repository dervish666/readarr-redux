import React from 'react';
import Modal from 'Components/Modal/Modal';
import { sizes } from 'Helpers/Props';
import EditImportListExclusionModalContent, {
  EditImportListExclusionModalContentProps,
} from './EditImportListExclusionModalContent';

interface EditImportListExclusionModalProps
  extends EditImportListExclusionModalContentProps {
  isOpen: boolean;
}

function EditImportListExclusionModal({
  isOpen,
  onModalClose,
  ...otherProps
}: EditImportListExclusionModalProps) {
  return (
    <Modal size={sizes.MEDIUM} isOpen={isOpen} onModalClose={onModalClose}>
      <EditImportListExclusionModalContent
        {...otherProps}
        onModalClose={onModalClose}
      />
    </Modal>
  );
}

export default EditImportListExclusionModal;
