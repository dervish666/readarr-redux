import PropTypes from 'prop-types';
import React, { useCallback } from 'react';
import { useSystemStatusData } from 'System/Status/useSystemStatus';
import { useRestart, useShutdown } from 'System/useSystem';
import PageHeaderActionsMenu from './PageHeaderActionsMenu';

function PageHeaderActionsMenuConnector({ onKeyboardShortcutsPress }) {
  const { authentication } = useSystemStatusData();
  const { mutate: restart } = useRestart();
  const { mutate: shutdown } = useShutdown();

  const handleRestartPress = useCallback(() => {
    restart();
  }, [restart]);

  const handleShutdownPress = useCallback(() => {
    shutdown();
  }, [shutdown]);

  return (
    <PageHeaderActionsMenu
      formsAuth={authentication === 'forms'}
      onKeyboardShortcutsPress={onKeyboardShortcutsPress}
      onRestartPress={handleRestartPress}
      onShutdownPress={handleShutdownPress}
    />
  );
}

PageHeaderActionsMenuConnector.propTypes = {
  onKeyboardShortcutsPress: PropTypes.func.isRequired
};

export default PageHeaderActionsMenuConnector;
