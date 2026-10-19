import React, { useCallback, useMemo, useState } from 'react';
import QueueDetailsProvider from 'Activity/Queue/Details/QueueDetailsProvider';
import NoAuthor from 'Author/NoAuthor';
import useAuthors from 'Author/useAuthors';
import Alert from 'Components/Alert';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import Measure from 'Components/Measure';
import FilterMenu from 'Components/Menu/FilterMenu';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageToolbar from 'Components/Page/Toolbar/PageToolbar';
import PageToolbarButton from 'Components/Page/Toolbar/PageToolbarButton';
import PageToolbarSection from 'Components/Page/Toolbar/PageToolbarSection';
import { align, icons, kinds } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import Calendar from './Calendar';
import CalendarMissingBookSearchButton from './CalendarMissingBookSearchButton';
import { setCalendarOption, useCalendarOption } from './calendarOptionsStore';
import CalendarLinkModal from './iCal/CalendarLinkModal';
import Legend from './Legend/Legend';
import CalendarOptionsModal from './Options/CalendarOptionsModal';
import useCalendar, {
  FILTERS,
  setCalendarDayCount,
  useCalendarPage,
} from './useCalendar';
import styles from './CalendarPage.css';

const MINIMUM_DAY_WIDTH = 120;
const NO_CUSTOM_FILTERS: never[] = [];

function CalendarPage() {
  const selectedFilterKey = useCalendarOption('selectedFilterKey');
  const { data } = useCalendar();

  useCalendarPage();

  const {
    data: authors,
    isFetched: isAuthorsFetched,
    error: authorsError,
  } = useAuthors();

  const hasAuthor = !!authors.length;

  const [width, setWidth] = useState(0);
  const [isCalendarLinkModalOpen, setIsCalendarLinkModalOpen] = useState(false);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);

  const bookIds = useMemo(() => {
    return data.map((book) => book.id);
  }, [data]);

  const handleMeasure = useCallback(({ width }: { width: number }) => {
    setWidth(width);

    setCalendarDayCount(
      Math.max(3, Math.min(7, Math.floor(width / MINIMUM_DAY_WIDTH)))
    );
  }, []);

  const handleGetCalendarLinkPress = useCallback(() => {
    setIsCalendarLinkModalOpen(true);
  }, []);

  const handleGetCalendarLinkModalClose = useCallback(() => {
    setIsCalendarLinkModalOpen(false);
  }, []);

  const handleOptionsPress = useCallback(() => {
    setIsOptionsModalOpen(true);
  }, []);

  const handleOptionsModalClose = useCallback(() => {
    setIsOptionsModalOpen(false);
  }, []);

  const handleFilterSelect = useCallback((key: string | number) => {
    setCalendarOption('selectedFilterKey', key);
  }, []);

  return (
    <QueueDetailsProvider bookIds={bookIds}>
      <PageContent title={translate('Calendar')}>
        <PageToolbar>
          <PageToolbarSection>
            <PageToolbarButton
              label={translate('ICalLink')}
              iconName={icons.CALENDAR}
              onPress={handleGetCalendarLinkPress}
            />

            <CalendarMissingBookSearchButton />
          </PageToolbarSection>

          <PageToolbarSection alignContent={align.RIGHT}>
            <PageToolbarButton
              label={translate('Options')}
              iconName={icons.POSTER}
              onPress={handleOptionsPress}
            />

            <FilterMenu
              alignMenu={align.RIGHT}
              isDisabled={!hasAuthor}
              selectedFilterKey={selectedFilterKey}
              filters={FILTERS}
              customFilters={NO_CUSTOM_FILTERS}
              onFilterSelect={handleFilterSelect}
            />
          </PageToolbarSection>
        </PageToolbar>

        <PageContentBody
          className={styles.calendarPageBody}
          innerClassName={styles.calendarInnerPageBody}
        >
          {!isAuthorsFetched && !authorsError ? <LoadingIndicator /> : null}

          {authorsError ? (
            <Alert kind={kinds.DANGER}>
              {translate('FailedToLoadAuthorFromApi')}
            </Alert>
          ) : null}

          {isAuthorsFetched && !authorsError && hasAuthor ? (
            <Measure onMeasure={handleMeasure}>
              {width > 0 ? <Calendar /> : <div />}
            </Measure>
          ) : null}

          {isAuthorsFetched && !authorsError && !hasAuthor ? (
            <NoAuthor totalItems={0} />
          ) : null}

          {hasAuthor && !authorsError ? <Legend /> : null}
        </PageContentBody>

        <CalendarLinkModal
          isOpen={isCalendarLinkModalOpen}
          onModalClose={handleGetCalendarLinkModalClose}
        />

        <CalendarOptionsModal
          isOpen={isOptionsModalOpen}
          onModalClose={handleOptionsModalClose}
        />
      </PageContent>
    </QueueDetailsProvider>
  );
}

export default CalendarPage;
