import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useToggleBooksMonitored } from 'Book/useBooks';
import * as commandNames from 'Commands/commandNames';
import { useCommandExecuting, useExecuteCommand } from 'Commands/useCommands';
import Alert from 'Components/Alert';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import FilterMenu from 'Components/Menu/FilterMenu';
import ConfirmModal from 'Components/Modal/ConfirmModal';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageHeading from 'Components/Page/PageHeading';
import PageToolbar from 'Components/Page/Toolbar/PageToolbar';
import PageToolbarButton from 'Components/Page/Toolbar/PageToolbarButton';
import PageToolbarSection from 'Components/Page/Toolbar/PageToolbarSection';
import PageToolbarSeparator from 'Components/Page/Toolbar/PageToolbarSeparator';
import Table from 'Components/Table/Table';
import TableBody from 'Components/Table/TableBody';
import TableOptionsModalWrapper from 'Components/Table/TableOptions/TableOptionsModalWrapper';
import TablePager from 'Components/Table/TablePager';
import { PageableOptions } from 'Helpers/Hooks/useOptionsStore';
import useSelectState from 'Helpers/Hooks/useSelectState';
import { align, icons, kinds } from 'Helpers/Props';
import SortDirection from 'Helpers/Props/SortDirection';
import InteractiveImportModal from 'InteractiveImport/InteractiveImportModal';
import { SelectStateInputProps } from 'typings/props';
import {
  registerPagePopulator,
  unregisterPagePopulator,
} from 'Utilities/pagePopulator';
import translate from 'Utilities/String/translate';
import getSelectedIds from 'Utilities/Table/getSelectedIds';
import useWanted from './useWanted';
import { FILTERS, isShowingMonitored } from './wantedFilters';
import WantedRow from './WantedRow';

const NO_CUSTOM_FILTERS: never[] = [];

export interface WantedPageProps {
  title: string;
  searchAllCommand: string;
  searchAllTitle: string;
  searchAllMessage: (totalRecords: number) => string;
  loadError: string;
  emptyMessage: string;
  showManualImport: boolean;
  data: ReturnType<typeof useWanted>;
  options: PageableOptions;
  setOption: (key: 'selectedFilterKey', value: string | number) => void;
  setOptions: (options: Partial<PageableOptions>) => void;
  setSort: (sort: { sortKey: string; sortDirection?: SortDirection }) => void;
}

// The missing and cutoff unmet pages: a paged table of books with search, monitor
// toggling and (missing only) manual import.
function Wanted({
  title,
  searchAllCommand,
  searchAllTitle,
  searchAllMessage,
  loadError,
  emptyMessage,
  showManualImport,
  data,
  options,
  setOption,
  setOptions,
  setSort,
}: WantedPageProps) {
  const {
    records,
    totalPages,
    totalRecords,
    error,
    isFetching,
    isFetched,
    isSuccess,
    isLoading,
    page,
    goToPage,
    refetch,
  } = data;

  const { columns, pageSize, sortKey, sortDirection, selectedFilterKey } =
    options;

  const executeCommand = useExecuteCommand();
  const isSearchingForAll = useCommandExecuting(searchAllCommand);
  const { toggleBooksMonitored, isTogglingBooksMonitored } =
    useToggleBooksMonitored();

  const [selectState, setSelectState] = useSelectState();
  const { allSelected, allUnselected, selectedState } = selectState;

  const [isConfirmSearchAllModalOpen, setIsConfirmSearchAllModalOpen] =
    useState(false);
  const [isInteractiveImportModalOpen, setIsInteractiveImportModalOpen] =
    useState(false);

  const selectedIds: number[] = useMemo(() => {
    return getSelectedIds(selectedState);
  }, [selectedState]);

  const isShowingMonitoredBooks = isShowingMonitored(selectedFilterKey);
  const anySelected = selectedIds.length > 0;

  useEffect(() => {
    // A failed load must not drop the selection.
    if (isSuccess) {
      setSelectState({ type: 'updateItems', items: records });
    }
  }, [records, isSuccess, setSelectState]);

  useEffect(() => {
    const repopulate = () => {
      refetch();
    };

    registerPagePopulator(repopulate, ['bookFileUpdated', 'bookFileDeleted']);

    return () => {
      unregisterPagePopulator(repopulate);
    };
  }, [refetch]);

  const handleSelectAllChange = useCallback(
    ({ value }: { value: boolean }) => {
      setSelectState({
        type: value ? 'selectAll' : 'unselectAll',
        items: records,
      });
    },
    [records, setSelectState]
  );

  const handleSelectedChange = useCallback(
    ({ id, value, shiftKey = false }: SelectStateInputProps) => {
      setSelectState({
        type: 'toggleSelected',
        items: records,
        id,
        isSelected: value,
        shiftKey,
      });
    },
    [records, setSelectState]
  );

  const handleSearchSelectedPress = useCallback(() => {
    executeCommand(
      {
        name: commandNames.BOOK_SEARCH,
        bookIds: selectedIds,
      },
      () => {
        refetch();
      }
    );
  }, [selectedIds, executeCommand, refetch]);

  const handleToggleSelectedPress = useCallback(() => {
    toggleBooksMonitored(
      {
        bookIds: selectedIds,
        monitored: !isShowingMonitoredBooks,
      },
      {
        onSuccess: () => {
          refetch();
        },
      }
    );
  }, [selectedIds, isShowingMonitoredBooks, toggleBooksMonitored, refetch]);

  const handleSearchAllPress = useCallback(() => {
    setIsConfirmSearchAllModalOpen(true);
  }, []);

  const handleSearchAllConfirmed = useCallback(() => {
    executeCommand({ name: searchAllCommand }, () => {
      refetch();
    });

    setIsConfirmSearchAllModalOpen(false);
  }, [searchAllCommand, executeCommand, refetch]);

  const handleConfirmSearchAllModalClose = useCallback(() => {
    setIsConfirmSearchAllModalOpen(false);
  }, []);

  const handleInteractiveImportPress = useCallback(() => {
    setIsInteractiveImportModalOpen(true);
  }, []);

  const handleInteractiveImportModalClose = useCallback(() => {
    setIsInteractiveImportModalOpen(false);
  }, []);

  const handleFilterSelect = useCallback(
    (key: string | number) => {
      setOption('selectedFilterKey', key);
      goToPage(1);
    },
    [setOption, goToPage]
  );

  const handleSortPress = useCallback(
    (sortKey: string, sortDirection?: SortDirection) => {
      setSort({ sortKey, sortDirection });
    },
    [setSort]
  );

  const handleTableOptionChange = useCallback(
    (payload: Partial<PageableOptions>) => {
      setOptions(payload);

      if (payload.pageSize) {
        goToPage(1);
      }
    },
    [setOptions, goToPage]
  );

  const handleFirstPagePress = useCallback(() => {
    goToPage(1);
  }, [goToPage]);

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
    <PageContent title={title}>
      <PageToolbar>
        <PageToolbarSection>
          <PageToolbarButton
            label={translate('SearchSelected')}
            iconName={icons.SEARCH}
            isDisabled={!anySelected || isSearchingForAll}
            onPress={handleSearchSelectedPress}
          />

          <PageToolbarButton
            label={
              isShowingMonitoredBooks
                ? translate('IsShowingMonitoredUnmonitorSelected')
                : translate('IsShowingMonitoredMonitorSelected')
            }
            iconName={
              isShowingMonitoredBooks ? icons.UNMONITORED : icons.MONITORED
            }
            isDisabled={!anySelected}
            isSpinning={isTogglingBooksMonitored}
            onPress={handleToggleSelectedPress}
          />

          <PageToolbarSeparator />

          <PageToolbarButton
            label={translate('SearchAll')}
            iconName={icons.SEARCH}
            isDisabled={!records.length}
            isSpinning={isSearchingForAll}
            onPress={handleSearchAllPress}
          />

          {showManualImport ? (
            <>
              <PageToolbarSeparator />

              <PageToolbarButton
                label={translate('ManualImport')}
                iconName={icons.INTERACTIVE}
                onPress={handleInteractiveImportPress}
              />
            </>
          ) : null}
        </PageToolbarSection>

        <PageToolbarSection alignContent={align.RIGHT}>
          <TableOptionsModalWrapper
            columns={columns}
            pageSize={pageSize}
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
        <PageHeading scope={translate('Wanted')} title={title} />

        {isLoading && !isFetched ? <LoadingIndicator /> : null}

        {!isLoading && error ? (
          <Alert kind={kinds.DANGER}>{loadError}</Alert>
        ) : null}

        {isFetched && !error && !records.length ? (
          <Alert kind={kinds.INFO}>{emptyMessage}</Alert>
        ) : null}

        {isFetched && !error && !!records.length ? (
          <div>
            <Table
              columns={columns}
              pageSize={pageSize}
              sortKey={sortKey}
              sortDirection={sortDirection}
              selectAll={true}
              allSelected={allSelected}
              allUnselected={allUnselected}
              onTableOptionChange={handleTableOptionChange}
              onSelectAllChange={handleSelectAllChange}
              onSortPress={handleSortPress}
            >
              <TableBody>
                {records.map((item) => {
                  return (
                    <WantedRow
                      key={item.id}
                      book={item}
                      columns={columns}
                      isSelected={selectedState[item.id]}
                      onSelectedChange={handleSelectedChange}
                    />
                  );
                })}
              </TableBody>
            </Table>

            <TablePager
              page={page}
              totalPages={totalPages}
              totalRecords={totalRecords}
              isFetching={isFetching}
              onFirstPagePress={handleFirstPagePress}
              onPreviousPagePress={handlePreviousPagePress}
              onNextPagePress={handleNextPagePress}
              onLastPagePress={handleLastPagePress}
              onPageSelect={goToPage}
            />

            <ConfirmModal
              isOpen={isConfirmSearchAllModalOpen}
              kind={kinds.DANGER}
              title={searchAllTitle}
              message={
                <div>
                  <div>{searchAllMessage(totalRecords)}</div>
                  <div>{translate('MassSearchCancelWarning')}</div>
                </div>
              }
              confirmLabel={translate('Search')}
              onConfirm={handleSearchAllConfirmed}
              onCancel={handleConfirmSearchAllModalClose}
            />
          </div>
        ) : null}

        {showManualImport ? (
          <InteractiveImportModal
            isOpen={isInteractiveImportModalOpen}
            showReplaceExistingFiles={true}
            onModalClose={handleInteractiveImportModalClose}
          />
        ) : null}
      </PageContentBody>
    </PageContent>
  );
}

export default Wanted;
