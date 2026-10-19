import React, { useCallback } from 'react';
import * as commandNames from 'Commands/commandNames';
import { useCommandExecuting, useExecuteCommand } from 'Commands/useCommands';
import LogFiles from '../LogFiles';
import useLogFiles from '../useLogFiles';

function AppLogFiles() {
  const { data = [], isFetching, refetch } = useLogFiles();

  const isDeleteFilesExecuting: boolean = useCommandExecuting(
    commandNames.DELETE_LOG_FILES
  );

  const executeCommand = useExecuteCommand();

  const handleRefreshPress = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleDeleteFilesPress = useCallback(() => {
    executeCommand({ name: commandNames.DELETE_LOG_FILES }, () => {
      refetch();
    });
  }, [executeCommand, refetch]);

  return (
    <LogFiles
      isDeleteFilesExecuting={isDeleteFilesExecuting}
      isFetching={isFetching}
      items={data}
      type="app"
      onRefreshPress={handleRefreshPress}
      onDeleteFilesPress={handleDeleteFilesPress}
    />
  );
}

export default AppLogFiles;
