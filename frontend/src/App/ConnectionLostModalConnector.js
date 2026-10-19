import PropTypes from 'prop-types';
import React from 'react';
import ConnectionLostModal from './ConnectionLostModal';

// Closing the modal reloads the page, whatever onModalClose the caller passes.
function onModalClose() {
  location.reload();
}

function ConnectionLostModalConnector({ isOpen }) {
  return (
    <ConnectionLostModal
      isOpen={isOpen}
      onModalClose={onModalClose}
    />
  );
}

ConnectionLostModalConnector.propTypes = {
  isOpen: PropTypes.bool.isRequired
};

export default ConnectionLostModalConnector;
