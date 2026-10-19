import { createOptionsStore } from 'Helpers/Hooks/useOptionsStore';
import { CalendarView } from './calendarViews';

export interface CalendarOptions {
  collapseMultipleBooks: boolean;
  showCutoffUnmetIcon: boolean;
  selectedFilterKey: string | number;
  view: CalendarView;
}

const { useOptions, useOption, getOptions, getOption, setOptions, setOption } =
  createOptionsStore<CalendarOptions>('calendar_options', () => {
    return {
      collapseMultipleBooks: false,
      showCutoffUnmetIcon: false,
      selectedFilterKey: 'monitored',
      view: window.innerWidth > 768 ? 'week' : 'day',
    };
  });

export const useCalendarOptions = useOptions;
export const getCalendarOptions = getOptions;
export const setCalendarOptions = setOptions;
export const useCalendarOption = useOption;
export const getCalendarOption = getOption;
export const setCalendarOption = setOption;
