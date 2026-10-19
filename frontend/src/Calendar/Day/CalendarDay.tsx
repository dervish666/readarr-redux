import classNames from 'classnames';
import moment from 'moment';
import React, { useEffect, useMemo, useRef } from 'react';
import { useCalendarOption } from 'Calendar/calendarOptionsStore';
import * as calendarViews from 'Calendar/calendarViews';
import CalendarEvent from 'Calendar/Events/CalendarEvent';
import useCalendar, { useCalendarTime } from 'Calendar/useCalendar';
import styles from './CalendarDay.css';

const useCalendarEvents = (date: string) => {
  const { data } = useCalendar();

  return useMemo(() => {
    const momentDate = moment(date);

    return data
      .filter((item) => momentDate.isSame(moment(item.releaseDate), 'day'))
      .sort(
        (a, b) => moment(a.releaseDate).unix() - moment(b.releaseDate).unix()
      );
  }, [data, date]);
};

interface CalendarDayProps {
  date: string;
  isTodaysDate: boolean;
}

function CalendarDay({ date, isTodaysDate }: CalendarDayProps) {
  const view = useCalendarOption('view');
  const time = useCalendarTime();
  const events = useCalendarEvents(date);

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isTodaysDate && view === calendarViews.MONTH && ref.current) {
      ref.current.scrollIntoView();
    }
  }, [time, isTodaysDate, view]);

  return (
    <div
      ref={ref}
      className={classNames(
        styles.day,
        view === calendarViews.DAY && styles.isSingleDay,
        isTodaysDate && styles.isTodayCell
      )}
    >
      {view === calendarViews.MONTH ? (
        <div
          className={classNames(
            styles.dayOfMonth,
            isTodaysDate && styles.isToday,
            !moment(date).isSame(moment(time), 'month') &&
              styles.isDifferentMonth
          )}
        >
          {moment(date).date()}
        </div>
      ) : null}

      <div>
        {events.map((event) => {
          return <CalendarEvent key={event.id} book={event} />;
        })}
      </div>
    </div>
  );
}

export default CalendarDay;
