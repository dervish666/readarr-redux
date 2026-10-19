import React, {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as commandNames from 'Commands/commandNames';
import { useCommandExecuting, useExecuteCommand } from 'Commands/useCommands';
import Alert from 'Components/Alert';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
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
import useSelectState from 'Helpers/Hooks/useSelectState';
import { align, icons, kinds } from 'Helpers/Props';
import SortDirection from 'Helpers/Props/SortDirection';
import { SelectStateInputProps } from 'typings/props';
import QueueModel from 'typings/Queue';
import {
  registerPagePopulator,
  unregisterPagePopulator,
} from 'Utilities/pagePopulator';
import translate from 'Utilities/String/translate';
import getSelectedIds from 'Utilities/Table/getSelectedIds';
import QueueOptions from './QueueOptions';
import {
  QueueOptions as QueueOptionsModel,
  setQueueOptions,
  setQueueSort,
  useQueueOptions,
} from './queueOptionsStore';
import QueueRow from './QueueRow';
import RemoveQueueItemModal from './RemoveQueueItemModal';
import useQueue, {
  QueueRemovalOptions,
  useGrabQueueItems,
  useRemoveQueueItems,
} from './useQueue';

function Queue() {
  const {
    records,
    totalPages,
    totalRecords,
    error,
    isFetching,
    isLoading,
    isSuccess,
    page,
    goToPage,
    refetch,
  } = useQueue();

  const { columns, pageSize, sortKey, sortDirection } = useQueueOptions();

  const { isRemoving, removeQueueItems } = useRemoveQueueItems();
  const { isGrabbing, grabQueueItems } = useGrabQueueItems();

  const isRefreshMonitoredDownloadsExecuting = useCommandExecuting(
    commandNames.REFRESH_MONITORED_DOWNLOADS
  );

  const executeCommand = useExecuteCommand();

  // While a row's modal is open the table keeps what it showed, so the row
  // doesn't vanish from under the modal when the queue refreshes.
  const shouldBlockRefresh = useRef(false);
  const currentQueue = useRef<ReactElement | null>(null);

  const [selectState, setSelectState] = useSelectState();
  const { allSelected, allUnselected, selectedState } = selectState;

  const selectedIds: number[] = useMemo(() => {
    return getSelectedIds(selectedState);
  }, [selectedState]);

  const [isConfirmRemoveModalOpen, setIsConfirmRemoveModalOpen] =
    useState(false);

  const isPendingSelected = useMemo(() => {
    return records.some((item) => {
      return selectedIds.indexOf(item.id) > -1 && item.status === 'delay';
    });
  }, [records, selectedIds]);

  const isRefreshing = isLoading || isRefreshMonitoredDownloadsExecuting;
  const isPopulated = !isLoading;
  const selectedCount = selectedIds.length;
  const disableSelectedActions = selectedCount === 0;

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

    registerPagePopulator(repopulate);

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

  const handleRefreshPress = useCallback(() => {
    executeCommand({ name: commandNames.REFRESH_MONITORED_DOWNLOADS });
  }, [executeCommand]);

  const handleQueueRowModalOpenOrClose = useCallback((isOpen: boolean) => {
    shouldBlockRefresh.current = isOpen;
  }, []);

  const handleGrabSelectedPress = useCallback(() => {
    grabQueueItems({ ids: selectedIds });
  }, [selectedIds, grabQueueItems]);

  const handleRemoveSelectedPress = useCallback(() => {
    shouldBlockRefresh.current = true;
    setIsConfirmRemoveModalOpen(true);
  }, []);

  const handleRemoveSelectedConfirmed = useCallback(
    (options: QueueRemovalOptions) => {
      shouldBlockRefresh.current = false;
      removeQueueItems(selectedIds, options);
      setIsConfirmRemoveModalOpen(false);
    },
    [selectedIds, removeQueueItems]
  );

  const handleConfirmRemoveModalClose = useCallback(() => {
    shouldBlockRefresh.current = false;
    setIsConfirmRemoveModalOpen(false);
  }, []);

  const handleSortPress = useCallback(
    (sortKey: string, sortDirection?: SortDirection) => {
      setQueueSort({ sortKey, sortDirection });
    },
    []
  );

  const handleTableOptionChange = useCallback(
    (payload: Partial<QueueOptionsModel>) => {
      setQueueOptions(payload);

      if (payload.pageSize) {
        goToPage(1);
      }
    },
    [goToPage]
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

  if (!shouldBlockRefresh.current) {
    currentQueue.current = (
      <PageContentBody>
        <PageHeading scope={translate('Activity')} title={translate('Queue')} />

        {isRefreshing && !isPopulated ? <LoadingIndicator /> : null}

        {!isRefreshing && error ? (
          <Alert kind={kinds.DANGER}>{translate('FailedToLoadQueue')}</Alert>
        ) : null}

        {isPopulated && !error && !records.length ? (
          <Alert kind={kinds.INFO}>{translate('QueueIsEmpty')}</Alert>
        ) : null}

        {isPopulated && !error && !!records.length ? (
          <div>
            <Table
              columns={columns}
              pageSize={pageSize}
              sortKey={sortKey}
              sortDirection={sortDirection}
              selectAll={true}
              allSelected={allSelected}
              allUnselected={allUnselected}
              optionsComponent={QueueOptions}
              onTableOptionChange={handleTableOptionChange}
              onSelectAllChange={handleSelectAllChange}
              onSortPress={handleSortPress}
            >
              <TableBody>
                {records.map((item: QueueModel) => {
                  return (
                    <QueueRow
                      key={item.id}
                      {...item}
                      isSelected={selectedState[item.id]}
                      columns={columns}
                      onSelectedChange={handleSelectedChange}
                      onQueueRowModalOpenOrClose={
                        handleQueueRowModalOpenOrClose
                      }
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
          </div>
        ) : null}
      </PageContentBody>
    );
  }

  return (
    <PageContent title={translate('Queue')}>
      <PageToolbar>
        <PageToolbarSection>
          <PageToolbarButton
            label={translate('Refresh')}
            iconName={icons.REFRESH}
            isSpinning={isRefreshing}
            onPress={handleRefreshPress}
          />

          <PageToolbarSeparator />

          <PageToolbarButton
            label={translate('GrabSelected')}
            iconName={icons.DOWNLOAD}
            isDisabled={disableSelectedActions || !isPendingSelected}
            isSpinning={isGrabbing}
            onPress={handleGrabSelectedPress}
          />

          <PageToolbarButton
            label={translate('RemoveSelected')}
            iconName={icons.REMOVE}
            isDisabled={disableSelectedActions}
            isSpinning={isRemoving}
            onPress={handleRemoveSelectedPress}
          />
        </PageToolbarSection>

        <PageToolbarSection alignContent={align.RIGHT}>
          <TableOptionsModalWrapper
            columns={columns}
            pageSize={pageSize}
            optionsComponent={QueueOptions}
            onTableOptionChange={handleTableOptionChange}
          >
            <PageToolbarButton
              label={translate('Options')}
              iconName={icons.TABLE}
            />
          </TableOptionsModalWrapper>
        </PageToolbarSection>
      </PageToolbar>

      {currentQueue.current}

      <RemoveQueueItemModal
        isOpen={isConfirmRemoveModalOpen}
        selectedCount={selectedCount}
        canChangeCategory={
          isConfirmRemoveModalOpen &&
          selectedIds.every((id) => {
            const item = records.find((i) => i.id === id);

            return !!(item && item.downloadClientHasPostImportCategory);
          })
        }
        canIgnore={
          isConfirmRemoveModalOpen &&
          selectedIds.every((id) => {
            const item = records.find((i) => i.id === id);

            return !!(item && item.authorId && item.bookId);
          })
        }
        isPending={
          isConfirmRemoveModalOpen &&
          selectedIds.every((id) => {
            const item = records.find((i) => i.id === id);

            if (!item) {
              return false;
            }

            return (
              item.status === 'delay' ||
              item.status === 'downloadClientUnavailable'
            );
          })
        }
        onRemovePress={handleRemoveSelectedConfirmed}
        onModalClose={handleConfirmRemoveModalClose}
      />
    </PageContent>
  );
}

export default Queue;
