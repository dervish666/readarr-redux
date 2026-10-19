import { keepPreviousData } from '@tanstack/react-query';
import moment, { Moment } from 'moment';
import { useEffect, useMemo } from 'react';
import { create } from 'zustand';
import Book from 'Book/Book';
import { Filter } from 'Filters/Filter';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import { filterTypes } from 'Helpers/Props';
import { useUiSettingsValues } from 'Settings/UI/useUiSettings';
import translate from 'Utilities/String/translate';
import { getCalendarOption, useCalendarOption } from './calendarOptionsStore';
import { CalendarView } from './calendarViews';

// GET /calendar has no monitored filter of its own: "All" asks for unmonitored books too.
export const FILTERS: Filter[] = [
  {
    key: 'all',
    label: () => translate('All'),
    filters: [
      {
        key: 'monitored',
        value: false,
        type: filterTypes.EQUAL,
      },
    ],
  },
  {
    key: 'monitored',
    label: () => translate('MonitoredOnly'),
    filters: [
      {
        key: 'monitored',
        value: true,
        type: filterTypes.EQUAL,
      },
    ],
  },
];

interface CalendarStore {
  time: Moment;
  dates: string[];
  dayCount: number;
  searchMissingBookIds?: number[];
}

const calendarStore = create<CalendarStore>(() => ({
  time: moment(),
  dates: [],
  dayCount: 7,
}));

const VIEW_RANGES: Record<
  CalendarView,
  moment.unitOfTime.DurationConstructor | undefined
> = {
  agenda: undefined,
  day: 'day',
  week: 'week',
  month: 'month',
  forecast: 'day',
};

const DEFAULT_BOOKS: Book[] = [];

export const useCalendarTime = () => {
  return calendarStore((state) => state.time);
};

export const useCalendarDates = () => {
  return calendarStore((state) => state.dates);
};

export const useCalendarDayCount = () => {
  return calendarStore((state) => state.dayCount);
};

export const useCalendarRange = () => {
  const dates = useCalendarDates();

  return {
    start: dates[0],
    end: dates[dates.length - 1],
  };
};

export const useCalendarSearchMissingBookIds = () => {
  return calendarStore((state) => state.searchMissingBookIds);
};

export const setCalendarSearchMissingBookIds = (bookIds: number[]) => {
  calendarStore.setState({ searchMissingBookIds: bookIds });
};

export const setCalendarDayCount = (dayCount: number) => {
  calendarStore.setState({ dayCount });
};

const setCalendarTime = (time: Moment) => {
  calendarStore.setState({ time });
};

export const goToToday = () => {
  setCalendarTime(moment());
};

export const goToPreviousRange = () => {
  const { dayCount, time } = calendarStore.getState();
  const view = getCalendarOption('view');

  const amount = view === 'forecast' ? dayCount : 1;

  setCalendarTime(moment(time).subtract(amount, VIEW_RANGES[view]));
};

export const goToNextRange = () => {
  const { dayCount, time } = calendarStore.getState();
  const view = getCalendarOption('view');

  const amount = view === 'forecast' ? dayCount : 1;

  setCalendarTime(moment(time).add(amount, VIEW_RANGES[view]));
};

const getDays = (start: Moment, end: Moment) => {
  const startTime = moment(start);
  const endTime = moment(end);
  const difference = endTime.diff(startTime, 'days');

  // Difference is one less than the number of days we need to account for.
  return Array(difference + 1)
    .fill(0)
    .map((_, i) => startTime.clone().add(i, 'days').toISOString());
};

const getDates = (
  time: Moment,
  view: CalendarView,
  firstDayOfWeek: number,
  dayCount: number
) => {
  const weekName = firstDayOfWeek === 0 ? 'week' : 'isoWeek';

  let start = time.clone().startOf('day');
  let end = time.clone().endOf('day');

  if (view === 'week') {
    start = time.clone().startOf(weekName);
    end = time.clone().endOf(weekName);
  }

  if (view === 'forecast') {
    start = time.clone().subtract(1, 'day').startOf('day');
    end = time
      .clone()
      .add(dayCount - 2, 'days')
      .endOf('day');
  }

  if (view === 'month') {
    start = time.clone().startOf('month').startOf(weekName);
    end = time.clone().endOf('month').endOf(weekName);
  }

  if (view === 'agenda') {
    start = time.clone().subtract(1, 'day').startOf('day');
    end = time.clone().add(1, 'month').endOf('day');
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    dates: getDays(start, end),
  };
};

// The request covers a little more than the view, so stepping to the next day or week
// already has its books.
function getPopulatableRange(
  startDate: string | undefined,
  endDate: string | undefined,
  view: CalendarView
) {
  if (!startDate || !endDate) {
    return { start: undefined, end: undefined };
  }

  switch (view) {
    case 'day':
      return {
        start: moment(startDate).subtract(1, 'day').toISOString(),
        end: moment(endDate).add(1, 'day').toISOString(),
      };
    case 'week':
    case 'forecast':
      return {
        start: moment(startDate).subtract(1, 'week').toISOString(),
        end: moment(endDate).add(1, 'week').toISOString(),
      };
    default:
      return {
        start: startDate,
        end: endDate,
      };
  }
}

const useCalendar = () => {
  const dates = useCalendarDates();
  const selectedFilterKey = useCalendarOption('selectedFilterKey');
  const view = useCalendarOption('view');

  const { start, end } = useMemo(() => {
    return getPopulatableRange(dates[0], dates[dates.length - 1], view);
  }, [dates, view]);

  const { queryKey, ...result } = useApiQuery<Book[]>({
    path: '/calendar',
    queryParams: {
      unmonitored: selectedFilterKey === 'all',
      start,
      end,
    },
    queryOptions: {
      enabled: !!start && !!end,
      placeholderData: keepPreviousData,
    },
  });

  return {
    ...result,
    queryKey,
    data: (result.data as Book[] | undefined) ?? DEFAULT_BOOKS,
  };
};

export default useCalendar;

// Keeps the dates in step with the time, view, day count and first day of the week.
export const useCalendarPage = () => {
  const dayCount = useCalendarDayCount();
  const time = useCalendarTime();
  const view = useCalendarOption('view');
  const { firstDayOfWeek } = useUiSettingsValues();

  useEffect(() => {
    const { dates } = getDates(time, view, firstDayOfWeek, dayCount);

    calendarStore.setState({ dates });
  }, [firstDayOfWeek, dayCount, time, view]);
};
