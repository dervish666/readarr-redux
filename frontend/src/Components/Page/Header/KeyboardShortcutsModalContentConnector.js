import PropTypes from 'prop-types';
import React from 'react';
import { useSystemStatusData } from 'System/Status/useSystemStatus';
import KeyboardShortcutsModalContent from './KeyboardShortcutsModalContent';

function KeyboardShortcutsModalContentConnector({ onModalClose }) {
  const { isOsx } = useSystemStatusData();

  return (
    <KeyboardShortcutsModalContent
      isOsx={!!isOsx}
      onModalClose={onModalClose}
    />
  );
}

KeyboardShortcutsModalContentConnector.propTypes = {
  onModalClose: PropTypes.func.isRequired
};

export default KeyboardShortcutsModalContentConnector;
