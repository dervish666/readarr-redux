import React, { useCallback } from 'react';
import { CalendarView } from 'Calendar/calendarViews';
import Link from 'Components/Link/Link';
import translate from 'Utilities/String/translate';

export const getCalendarViewTitle = (view: CalendarView) => {
  switch (view) {
    case 'agenda':
      return translate('Agenda');
    case 'day':
      return translate('Day');
    case 'forecast':
      return translate('Forecast');
    case 'month':
      return translate('Month');
    default:
      return translate('Week');
  }
};

interface CalendarHeaderViewButtonProps {
  className?: string;
  view: CalendarView;
  selectedView: CalendarView;
  onPress: (view: CalendarView) => void;
}

function CalendarHeaderViewButton({
  className,
  view,
  selectedView,
  onPress,
}: CalendarHeaderViewButtonProps) {
  const handlePress = useCallback(() => {
    onPress(view);
  }, [view, onPress]);

  return (
    <Link
      className={className}
      isDisabled={selectedView === view}
      onPress={handlePress}
    >
      {getCalendarViewTitle(view)}
    </Link>
  );
}

export default CalendarHeaderViewButton;
