import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AppState from 'App/State/AppState';
import Command from 'Commands/Command';
import SpinnerIconButton from 'Components/Link/SpinnerIconButton';
import TableRowCell from 'Components/Table/Cells/TableRowCell';
import TableRow from 'Components/Table/TableRow';
import usePrevious from 'Helpers/Hooks/usePrevious';
import { icons } from 'Helpers/Props';
import { executeCommand } from 'Store/Actions/commandActions';
import createUISettingsSelector from 'Store/Selectors/createUISettingsSelector';
import { findCommand, isCommandExecuting } from 'Utilities/Command';
import formatDate from 'Utilities/Date/formatDate';
import formatDateTime from 'Utilities/Date/formatDateTime';
import formatTimeSpan from 'Utilities/Date/formatTimeSpan';
import translate from 'Utilities/String/translate';
import { useRefreshTasks } from '../useTasks';
import styles from './ScheduledTaskRow.css';

interface ScheduledTaskRowProps {
  taskName: string;
  name: string;
  interval: number;
  lastExecution: string;
  lastStartTime: string;
  lastDuration: string;
  nextExecution: string;
}

function ScheduledTaskRow({
  taskName,
  name,
  interval,
  lastExecution,
  lastStartTime,
  lastDuration,
  nextExecution,
}: ScheduledTaskRowProps) {
  const dispatch = useDispatch();
  const refreshTasks = useRefreshTasks();
  const { showRelativeDates, longDateFormat, shortDateFormat, timeFormat } =
    useSelector(createUISettingsSelector());

  // Commands are still redux: running a task and its spinner use the command list.
  const command: Command | undefined = useSelector((state: AppState) =>
    findCommand(state.commands.items, { name: taskName })
  );

  const [time, setTime] = useState(Date.now());

  const isQueued = command?.status === 'queued';
  const isExecuting = isCommandExecuting(command);
  const wasExecuting = usePrevious(isExecuting);
  const isDisabled = interval === 0;
  const executeNow = !isDisabled && moment().isAfter(nextExecution);
  const hasNextExecutionTime = !isDisabled && !executeNow;
  const hasLastStartTime = moment(lastStartTime).isAfter('2010-01-01');

  const duration = useMemo(() => {
    return moment
      .duration(interval, 'minutes')
      .humanize()
      .replace(/^an?(?=\s)/, '1');
  }, [interval]);

  const { lastExecutionTime, nextExecutionTime } = useMemo(() => {
    if (showRelativeDates && time) {
      return {
        lastExecutionTime: moment(lastExecution).fromNow(),
        nextExecutionTime: isDisabled ? '-' : moment(nextExecution).fromNow(),
      };
    }

    return {
      lastExecutionTime: formatDate(lastExecution, shortDateFormat),
      nextExecutionTime: isDisabled
        ? '-'
        : formatDate(nextExecution, shortDateFormat),
    };
  }, [
    time,
    isDisabled,
    lastExecution,
    nextExecution,
    showRelativeDates,
    shortDateFormat,
  ]);

  const handleExecutePress = useCallback(() => {
    dispatch(executeCommand({ name: taskName }));
  }, [taskName, dispatch]);

  useEffect(() => {
    // The system/task SignalR sync normally refreshes the list; this covers a
    // missed message. Give the host a moment to record the run first.
    if (wasExecuting && !isExecuting) {
      const timeoutId = setTimeout(refreshTasks, 1000);

      return () => clearTimeout(timeoutId);
    }

    return undefined;
  }, [isExecuting, wasExecuting, refreshTasks]);

  useEffect(() => {
    const intervalId = setInterval(
      () => setTime(Date.now()),
      interval < 60 ? 10000 : 60000
    );

    return () => {
      clearInterval(intervalId);
    };
  }, [interval]);

  return (
    <TableRow>
      <TableRowCell>{name}</TableRowCell>
      <TableRowCell className={styles.interval}>
        {isDisabled ? 'disabled' : duration}
      </TableRowCell>

      <TableRowCell
        className={styles.lastExecution}
        title={formatDateTime(lastExecution, longDateFormat, timeFormat)}
      >
        {lastExecutionTime}
      </TableRowCell>

      {hasLastStartTime ? (
        <TableRowCell className={styles.lastDuration} title={lastDuration}>
          {formatTimeSpan(lastDuration)}
        </TableRowCell>
      ) : (
        <TableRowCell className={styles.lastDuration}>-</TableRowCell>
      )}

      {isDisabled ? (
        <TableRowCell className={styles.nextExecution}>-</TableRowCell>
      ) : null}

      {executeNow && isQueued ? (
        <TableRowCell className={styles.nextExecution}>queued</TableRowCell>
      ) : null}

      {executeNow && !isQueued ? (
        <TableRowCell className={styles.nextExecution}>now</TableRowCell>
      ) : null}

      {hasNextExecutionTime ? (
        <TableRowCell
          className={styles.nextExecution}
          title={formatDateTime(nextExecution, longDateFormat, timeFormat, {
            includeSeconds: true,
          })}
        >
          {nextExecutionTime}
        </TableRowCell>
      ) : null}

      <TableRowCell className={styles.actions}>
        <SpinnerIconButton
          name={icons.REFRESH}
          spinningName={icons.REFRESH}
          title={translate('Run')}
          aria-label={translate('Run')}
          isSpinning={isExecuting}
          onPress={handleExecutePress}
        />
      </TableRowCell>
    </TableRow>
  );
}

export default ScheduledTaskRow;
