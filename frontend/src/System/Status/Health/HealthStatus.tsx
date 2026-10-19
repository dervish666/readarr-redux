import React, { useEffect, useMemo } from 'react';
import { useAppValue } from 'App/appStore';
import PageSidebarStatus from 'Components/Page/Sidebar/PageSidebarStatus';
import usePrevious from 'Helpers/Hooks/usePrevious';
import useHealth from './useHealth';

function HealthStatus() {
  const isConnected = useAppValue('isConnected');
  const isReconnecting = useAppValue('isReconnecting');
  const { data, refetch } = useHealth();

  const wasReconnecting = usePrevious(isReconnecting);

  const { count, errors, warnings } = useMemo(() => {
    return {
      count: data.length,
      errors: data.some((item) => item.type === 'error'),
      warnings: data.some((item) => item.type === 'warning'),
    };
  }, [data]);

  useEffect(() => {
    if (isConnected && wasReconnecting) {
      refetch();
    }
  }, [isConnected, wasReconnecting, refetch]);

  return (
    <PageSidebarStatus count={count} errors={errors} warnings={warnings} />
  );
}

export default HealthStatus;
