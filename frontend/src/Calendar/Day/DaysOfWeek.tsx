import moment from 'moment';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCalendarOption } from 'Calendar/calendarOptionsStore';
import * as calendarViews from 'Calendar/calendarViews';
import { useCalendarDates } from 'Calendar/useCalendar';
import { useUiSettingsValues } from 'Settings/UI/useUiSettings';
import DayOfWeek from './DayOfWeek';
import styles from './DaysOfWeek.module.css';

function DaysOfWeek() {
  const view = useCalendarOption('view');
  const dates = useCalendarDates();
  const { calendarWeekColumnHeader, shortDateFormat, showRelativeDates } =
    useUiSettingsValues();

  const updateTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [todaysDate, setTodaysDate] = useState(
    moment().startOf('day').toISOString()
  );

  const scheduleUpdate = useCallback(() => {
    clearTimeout(updateTimeout.current);

    const todaysDate = moment().startOf('day');
    const diff = todaysDate.clone().add(1, 'day').diff(moment());

    setTodaysDate(todaysDate.toISOString());

    updateTimeout.current = setTimeout(scheduleUpdate, diff);
  }, []);

  useEffect(() => {
    if (view !== calendarViews.AGENDA && view !== calendarViews.MONTH) {
      scheduleUpdate();
    }

    return () => {
      clearTimeout(updateTimeout.current);
    };
  }, [view, scheduleUpdate]);

  if (view === calendarViews.AGENDA) {
    return null;
  }

  const headerDates = view === calendarViews.MONTH ? dates.slice(0, 7) : dates;

  return (
    <div className={styles.daysOfWeek}>
      {headerDates.map((date) => {
        return (
          <DayOfWeek
            key={date}
            date={date}
            view={view}
            isTodaysDate={date === todaysDate}
            calendarWeekColumnHeader={calendarWeekColumnHeader}
            shortDateFormat={shortDateFormat}
            showRelativeDates={showRelativeDates}
          />
        );
      })}
    </div>
  );
}

export default DaysOfWeek;
