import React, { useCallback } from 'react';
import Modal from 'Components/Modal/Modal';
import { sizes } from 'Helpers/Props';
import { CustomFormatSpecification } from '../useCustomFormats';
import AddSpecificationModalContent from './AddSpecificationModalContent';

interface AddSpecificationModalProps {
  isOpen: boolean;
  onModalClose: (selectedSpec?: CustomFormatSpecification) => void;
}

function AddSpecificationModal({
  isOpen,
  onModalClose,
}: AddSpecificationModalProps) {
  // Escape or the backdrop closes without a selection.
  const handleModalClose = useCallback(() => {
    onModalClose();
  }, [onModalClose]);

  return (
    <Modal isOpen={isOpen} size={sizes.MEDIUM} onModalClose={handleModalClose}>
      <AddSpecificationModalContent onModalClose={onModalClose} />
    </Modal>
  );
}

export default AddSpecificationModal;
