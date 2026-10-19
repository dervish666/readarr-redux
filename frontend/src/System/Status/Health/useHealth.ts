import { useMemo } from 'react';
import { useAppValue } from 'App/appStore';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import Health from 'typings/Health';

const NO_HEALTH: Health[] = [];

// The UI's own check: without SignalR nothing on screen updates by itself.
const SIGNALR_HEALTH: Health = {
  source: 'UI',
  type: 'warning',
  message: "Could not connect to SignalR, UI won't update",
  wikiUrl:
    'https://wiki.servarr.com/readarr/system#could-not-connect-to-signalr',
};

const useHealth = () => {
  const isConnected = useAppValue('isConnected');

  const result = useApiQuery<Health[]>({
    path: '/health',
  });

  const serverItems = result.data ?? NO_HEALTH;

  const data = useMemo(() => {
    return isConnected ? serverItems : [...serverItems, SIGNALR_HEALTH];
  }, [isConnected, serverItems]);

  return {
    ...result,
    data,
  };
};

export default useHealth;
