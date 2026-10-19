import moment from 'moment';
import React, { useCallback, useMemo } from 'react';
import { useQueueDetailsList } from 'Activity/Queue/Details/QueueDetailsProvider';
import * as commandNames from 'Commands/commandNames';
import { useCommandExecuting, useExecuteCommand } from 'Commands/useCommands';
import PageToolbarButton from 'Components/Page/Toolbar/PageToolbarButton';
import { icons } from 'Helpers/Props';
import isBefore from 'Utilities/Date/isBefore';
import translate from 'Utilities/String/translate';
import useCalendar, {
  setCalendarSearchMissingBookIds,
  useCalendarRange,
  useCalendarSearchMissingBookIds,
} from './useCalendar';

// Released books in the shown range that have no file and aren't in the queue.
const useMissingBookIds = () => {
  const { start, end } = useCalendarRange();
  const { data } = useCalendar();
  const queueDetails = useQueueDetailsList();

  return useMemo(() => {
    return data.reduce<number[]>((acc, book) => {
      const releaseDate = book.releaseDate;

      if (
        (book.statistics?.percentOfBooks ?? 0) < 100 &&
        moment(releaseDate).isAfter(start) &&
        moment(releaseDate).isBefore(end) &&
        isBefore(releaseDate) &&
        !queueDetails.some((details) => details.bookId === book.id)
      ) {
        acc.push(book.id);
      }

      return acc;
    }, []);
  }, [data, start, end, queueDetails]);
};

function CalendarMissingBookSearchButton() {
  const executeCommand = useExecuteCommand();
  const searchMissingBookIds = useCalendarSearchMissingBookIds();
  const missingBookIds = useMissingBookIds();

  const isSearchingBooks = useCommandExecuting(commandNames.BOOK_SEARCH, {
    bookIds: searchMissingBookIds,
  });

  const isSearchingForMissing = !!searchMissingBookIds && isSearchingBooks;

  const handlePress = useCallback(() => {
    setCalendarSearchMissingBookIds(missingBookIds);

    executeCommand({
      name: commandNames.BOOK_SEARCH,
      bookIds: missingBookIds,
    });
  }, [missingBookIds, executeCommand]);

  return (
    <PageToolbarButton
      label={translate('SearchForMissing')}
      iconName={icons.SEARCH}
      isDisabled={!missingBookIds.length}
      isSpinning={isSearchingForMissing}
      onPress={handlePress}
    />
  );
}

export default CalendarMissingBookSearchButton;
