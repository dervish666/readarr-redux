import classNames from 'classnames';
import moment from 'moment';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppValue } from 'App/appStore';
import { useCalendarOption } from 'Calendar/calendarOptionsStore';
import * as calendarViews from 'Calendar/calendarViews';
import {
  goToNextRange,
  goToPreviousRange,
  useCalendarDates,
} from 'Calendar/useCalendar';
import CalendarDay from './CalendarDay';
import styles from './CalendarDays.module.css';

function CalendarDays() {
  const view = useCalendarOption('view');
  const dates = useCalendarDates();
  const isSidebarVisible = useAppValue('isSidebarVisible');

  const updateTimeout = useRef<ReturnType<typeof setTimeout>>();
  const touchStart = useRef<number | null>(null);
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

  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      const touches = event.touches;
      const currentTouch = touches[0].pageX;

      if (touches.length !== 1) {
        return;
      }

      if (currentTouch < 50 || isSidebarVisible) {
        return;
      }

      touchStart.current = currentTouch;
    },
    [isSidebarVisible]
  );

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    const touches = event.changedTouches;
    const currentTouch = touches[0].pageX;

    if (!touchStart.current) {
      return;
    }

    if (
      currentTouch > touchStart.current &&
      currentTouch - touchStart.current > 100
    ) {
      goToPreviousRange();
    } else if (
      currentTouch < touchStart.current &&
      touchStart.current - currentTouch > 100
    ) {
      goToNextRange();
    }

    touchStart.current = null;
  }, []);

  const handleTouchCancel = useCallback(() => {
    touchStart.current = null;
  }, []);

  useEffect(() => {
    if (view === calendarViews.MONTH) {
      scheduleUpdate();
    }

    return () => {
      clearTimeout(updateTimeout.current);
    };
  }, [view, scheduleUpdate]);

  useEffect(() => {
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchCancel);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [handleTouchStart, handleTouchEnd, handleTouchCancel]);

  return (
    <div
      className={classNames(styles.days, styles[view as keyof typeof styles])}
    >
      {dates.map((date) => {
        return (
          <CalendarDay
            key={date}
            date={date}
            isTodaysDate={date === todaysDate}
          />
        );
      })}
    </div>
  );
}

export default CalendarDays;
