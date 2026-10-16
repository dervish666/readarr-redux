import PropTypes from 'prop-types';
import React from 'react';
import Modal from 'Components/Modal/Modal';
import { sizes } from 'Helpers/Props';
import ImportDestinationsModalContent from './ImportDestinationsModalContent';

function ImportDestinationsModal(props) {
  const {
    isOpen,
    onModalClose,
    ...otherProps
  } = props;

  return (
    <Modal
      isOpen={isOpen}
      size={sizes.EXTRA_LARGE}
      onModalClose={onModalClose}
    >
      {
        isOpen &&
          <ImportDestinationsModalContent
            {...otherProps}
            onModalClose={onModalClose}
          />
      }
    </Modal>
  );
}

ImportDestinationsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onModalClose: PropTypes.func.isRequired
};

export default ImportDestinationsModal;
