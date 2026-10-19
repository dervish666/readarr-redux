import useApiQuery from 'Helpers/Hooks/useApiQuery';
import SystemStatus from 'typings/SystemStatus';

// System pages read /system/status through react-query. The shell (Page, header
// menu, settings, add-new modals) still reads the redux state.system.status feed,
// which PageConnector fetches at startup.
const useSystemStatus = () => {
  const result = useApiQuery<SystemStatus>({
    path: '/system/status',
  });

  return {
    ...result,
    data: result.data ?? ({} as SystemStatus),
  };
};

export default useSystemStatus;

export const useSystemStatusData = () => {
  const { data } = useSystemStatus();

  return data;
};
