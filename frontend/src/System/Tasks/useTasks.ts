import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import Task from 'typings/Task';

const NO_TASKS: Task[] = [];

// Refreshed by the system/task SignalR message (a sync after every run) and by
// ScheduledTaskRow when its command finishes.
const useTasks = () => {
  const result = useApiQuery<Task[]>({
    path: '/system/task',
  });

  return {
    ...result,
    data: result.data ?? NO_TASKS,
  };
};

export default useTasks;

export const useRefreshTasks = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/system/task'] });
  }, [queryClient]);
};
