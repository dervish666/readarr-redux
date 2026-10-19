import React, { useCallback, useEffect } from 'react';
import * as commandNames from 'Commands/commandNames';
import { useCommandExecuting, useExecuteCommand } from 'Commands/useCommands';
import Alert from 'Components/Alert';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import FilterMenu from 'Components/Menu/FilterMenu';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageHeading from 'Components/Page/PageHeading';
import PageToolbar from 'Components/Page/Toolbar/PageToolbar';
import PageToolbarButton from 'Components/Page/Toolbar/PageToolbarButton';
import PageToolbarSection from 'Components/Page/Toolbar/PageToolbarSection';
import Table from 'Components/Table/Table';
import TableBody from 'Components/Table/TableBody';
import TableOptionsModalWrapper from 'Components/Table/TableOptions/TableOptionsModalWrapper';
import TablePager from 'Components/Table/TablePager';
import { align, icons, kinds } from 'Helpers/Props';
import SortDirection from 'Helpers/Props/SortDirection';
import {
  registerPagePopulator,
  unregisterPagePopulator,
} from 'Utilities/pagePopulator';
import translate from 'Utilities/String/translate';
import {
  EventOptions,
  setEventOption,
  setEventOptions,
  setEventSort,
  useEventOptions,
} from './eventOptionsStore';
import LogsTableRow from './LogsTableRow';
import useEvents, { FILTERS } from './useEvents';

const NO_CUSTOM_FILTERS: never[] = [];

function LogsTable() {
  const {
    records,
    totalPages,
    totalRecords,
    error,
    isFetching,
    isFetched,
    isLoading,
    page,
    goToPage,
    refetch,
  } = useEvents();

  const { columns, pageSize, sortKey, sortDirection, selectedFilterKey } =
    useEventOptions();

  const isClearLogExecuting: boolean = useCommandExecuting(
    commandNames.CLEAR_LOGS
  );
  const executeCommand = useExecuteCommand();

  useEffect(() => {
    const repopulate = () => {
      refetch();
    };

    registerPagePopulator(repopulate);

    return () => {
      unregisterPagePopulator(repopulate);
    };
  }, [refetch]);

  const handleFilterSelect = useCallback(
    (selectedFilterKey: string | number) => {
      setEventOption('selectedFilterKey', selectedFilterKey);
      goToPage(1);
    },
    [goToPage]
  );

  const handleSortPress = useCallback(
    (sortKey: string, sortDirection?: SortDirection) => {
      setEventSort({ sortKey, sortDirection });
    },
    []
  );

  const handleTableOptionChange = useCallback(
    (payload: Partial<EventOptions>) => {
      setEventOptions(payload);

      if (payload.pageSize) {
        goToPage(1);
      }
    },
    [goToPage]
  );

  const handleRefreshPress = useCallback(() => {
    goToPage(1);
    refetch();
  }, [goToPage, refetch]);

  const handleClearLogsPress = useCallback(() => {
    executeCommand({ name: commandNames.CLEAR_LOGS }, () => {
      goToPage(1);
      refetch();
    });
  }, [executeCommand, goToPage, refetch]);

  const handlePreviousPagePress = useCallback(() => {
    goToPage(Math.max(page - 1, 1));
  }, [page, goToPage]);

  const handleNextPagePress = useCallback(() => {
    goToPage(Math.min(page + 1, totalPages));
  }, [page, totalPages, goToPage]);

  const handleLastPagePress = useCallback(() => {
    goToPage(totalPages);
  }, [totalPages, goToPage]);

  return (
    <PageContent title={translate('Logs')}>
      <PageToolbar>
        <PageToolbarSection>
          <PageToolbarButton
            label={translate('Refresh')}
            iconName={icons.REFRESH}
            spinningName={icons.REFRESH}
            isSpinning={isFetching}
            onPress={handleRefreshPress}
          />

          <PageToolbarButton
            label={translate('Clear')}
            iconName={icons.CLEAR}
            isSpinning={isClearLogExecuting}
            onPress={handleClearLogsPress}
          />
        </PageToolbarSection>

        <PageToolbarSection alignContent={align.RIGHT}>
          <TableOptionsModalWrapper
            columns={columns}
            pageSize={pageSize}
            canModifyColumns={false}
            onTableOptionChange={handleTableOptionChange}
          >
            <PageToolbarButton
              label={translate('Options')}
              iconName={icons.TABLE}
            />
          </TableOptionsModalWrapper>

          <FilterMenu
            alignMenu={align.RIGHT}
            selectedFilterKey={selectedFilterKey}
            filters={FILTERS}
            customFilters={NO_CUSTOM_FILTERS}
            onFilterSelect={handleFilterSelect}
          />
        </PageToolbarSection>
      </PageToolbar>

      <PageContentBody>
        <PageHeading scope={translate('System')} title={translate('Events')} />

        {isLoading && !isFetched ? <LoadingIndicator /> : null}

        {!isLoading && error ? (
          <Alert kind={kinds.DANGER}>{translate('UnableToLoadEvents')}</Alert>
        ) : null}

        {isFetched && !error && !records.length ? (
          <Alert kind={kinds.INFO}>{translate('NoEventsFound')}</Alert>
        ) : null}

        {isFetched && !error && !!records.length ? (
          <div>
            <Table
              columns={columns}
              pageSize={pageSize}
              sortKey={sortKey}
              sortDirection={sortDirection}
              canModifyColumns={false}
              onTableOptionChange={handleTableOptionChange}
              onSortPress={handleSortPress}
            >
              <TableBody>
                {records.map((item) => {
                  return (
                    <LogsTableRow key={item.id} columns={columns} {...item} />
                  );
                })}
              </TableBody>
            </Table>

            <TablePager
              page={page}
              totalPages={totalPages}
              totalRecords={totalRecords}
              isFetching={isFetching}
              onFirstPagePress={handleRefreshPress}
              onPreviousPagePress={handlePreviousPagePress}
              onNextPagePress={handleNextPagePress}
              onLastPagePress={handleLastPagePress}
              onPageSelect={goToPage}
            />
          </div>
        ) : null}
      </PageContentBody>
    </PageContent>
  );
}

export default LogsTable;
