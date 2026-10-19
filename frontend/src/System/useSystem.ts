import { useCallback } from 'react';
import { pingServer, setAppValue } from 'App/appStore';
import useApiMutation from 'Helpers/Hooks/useApiMutation';

// Ported from Sonarr 878f879c4 (#8223): restart and shutdown as mutations that
// drive the zustand app store.

export const useRestart = () => {
  const mutation = useApiMutation<void, void>({
    method: 'POST',
    path: '/system/restart',
  });

  const { mutate } = mutation;

  const restart = useCallback(() => {
    mutate(undefined, {
      onSuccess: () => {
        setAppValue({ isRestarting: true });
        pingServer();
      },
    });
  }, [mutate]);

  return {
    ...mutation,
    mutate: restart,
  };
};

export const useShutdown = () => {
  return useApiMutation<void, void>({
    method: 'POST',
    path: '/system/shutdown',
  });
};
