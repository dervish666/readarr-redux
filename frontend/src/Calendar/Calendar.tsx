import React, { useEffect, useRef, useState } from 'react';
import { useNavigationType } from 'react-router-dom';
import * as commandNames from 'Commands/commandNames';
import { useCommandExecuting } from 'Commands/useCommands';
import Alert from 'Components/Alert';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import usePrevious from 'Helpers/Hooks/usePrevious';
import { kinds } from 'Helpers/Props';
import {
  registerPagePopulator,
  unregisterPagePopulator,
} from 'Utilities/pagePopulator';
import translate from 'Utilities/String/translate';
import Agenda from './Agenda/Agenda';
import { useCalendarOption } from './calendarOptionsStore';
import CalendarDays from './Day/CalendarDays';
import DaysOfWeek from './Day/DaysOfWeek';
import CalendarHeader from './Header/CalendarHeader';
import useCalendar, { goToToday } from './useCalendar';
import styles from './Calendar.css';

const UPDATE_DELAY = 3600000; // 1 hour

function Calendar() {
  const navigationType = useNavigationType();

  // Coming back to the calendar (a POP) keeps the range the user left; any other
  // navigation starts at today, as withCurrentPage did.
  const [keepCurrentRange] = useState(navigationType === 'POP');
  const updateTimeout = useRef<ReturnType<typeof setTimeout>>();

  const { isFetching, isLoading, error, refetch } = useCalendar();
  const view = useCalendarOption('view');

  const isRefreshingAuthor = useCommandExecuting(commandNames.REFRESH_AUTHOR);
  const wasRefreshingAuthor = usePrevious(isRefreshingAuthor);

  useEffect(() => {
    if (!keepCurrentRange) {
      goToToday();
    }
  }, [keepCurrentRange]);

  useEffect(() => {
    function updateCalendar() {
      goToToday();
      updateTimeout.current = setTimeout(updateCalendar, UPDATE_DELAY);
    }

    updateTimeout.current = setTimeout(updateCalendar, UPDATE_DELAY);

    return () => {
      clearTimeout(updateTimeout.current);
    };
  }, []);

  useEffect(() => {
    const repopulate = () => {
      refetch();
    };

    registerPagePopulator(repopulate, ['bookFileUpdated', 'bookFileDeleted']);

    return () => {
      unregisterPagePopulator(repopulate);
    };
  }, [refetch]);

  // A refresh can add books to the range; book messages only update the ones shown.
  useEffect(() => {
    if (wasRefreshingAuthor && !isRefreshingAuthor) {
      refetch();
    }
  }, [isRefreshingAuthor, wasRefreshingAuthor, refetch]);

  return (
    <div className={styles.calendar}>
      {isLoading ? <LoadingIndicator /> : null}

      {!isFetching && error ? (
        <Alert kind={kinds.DANGER}>
          {translate('UnableToLoadTheCalendar')}
        </Alert>
      ) : null}

      {!error && !isLoading && view === 'agenda' ? (
        <div className={styles.calendarContent}>
          <CalendarHeader />
          <Agenda />
        </div>
      ) : null}

      {!error && !isLoading && view !== 'agenda' ? (
        <div className={styles.calendarContent}>
          <CalendarHeader />
          <DaysOfWeek />
          <CalendarDays />
        </div>
      ) : null}
    </div>
  );
}

export default Calendar;
