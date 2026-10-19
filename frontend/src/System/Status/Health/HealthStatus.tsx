import React, { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import AppState from 'App/State/AppState';
import PageSidebarStatus from 'Components/Page/Sidebar/PageSidebarStatus';
import usePrevious from 'Helpers/Hooks/usePrevious';
import useHealth from './useHealth';

function HealthStatus() {
  const isConnected = useSelector((state: AppState) => state.app.isConnected);
  const isReconnecting = useSelector(
    (state: AppState) => state.app.isReconnecting
  );
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
