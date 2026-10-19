import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as commandNames from 'Commands/commandNames';
import { useCommandExecuting, useExecuteCommand } from 'Commands/useCommands';
import Alert from 'Components/Alert';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import ConfirmModal from 'Components/Modal/ConfirmModal';
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
import useSelectState from 'Helpers/Hooks/useSelectState';
import { align, icons, kinds } from 'Helpers/Props';
import SortDirection from 'Helpers/Props/SortDirection';
import { SelectStateInputProps } from 'typings/props';
import {
  registerPagePopulator,
  unregisterPagePopulator,
} from 'Utilities/pagePopulator';
import translate from 'Utilities/String/translate';
import getSelectedIds from 'Utilities/Table/getSelectedIds';
import {
  BlocklistOptions,
  setBlocklistOptions,
  setBlocklistSort,
  useBlocklistOptions,
} from './blocklistOptionsStore';
import BlocklistRow from './BlocklistRow';
import useBlocklist, { useRemoveBlocklistItems } from './useBlocklist';

function Blocklist() {
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
  } = useBlocklist();

  const { columns, pageSize, sortKey, sortDirection } = useBlocklistOptions();
  const { isRemoving, removeBlocklistItems } = useRemoveBlocklistItems();

  const isClearingBlocklistExecuting = useCommandExecuting(
    commandNames.CLEAR_BLOCKLIST
  );

  const executeCommand = useExecuteCommand();

  const [selectState, setSelectState] = useSelectState();
  const { allSelected, allUnselected, selectedState } = selectState;

  const selectedIds: number[] = useMemo(() => {
    return getSelectedIds(selectedState);
  }, [selectedState]);

  const [isConfirmRemoveModalOpen, setIsConfirmRemoveModalOpen] =
    useState(false);
  const [isConfirmClearModalOpen, setIsConfirmClearModalOpen] = useState(false);

  useEffect(() => {
    setSelectState({ type: 'updateItems', items: records });
  }, [records, setSelectState]);

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

  const handleRemoveSelectedPress = useCallback(() => {
    setIsConfirmRemoveModalOpen(true);
  }, []);

  const handleRemoveSelectedConfirmed = useCallback(() => {
    removeBlocklistItems({ ids: selectedIds });
    setIsConfirmRemoveModalOpen(false);
  }, [selectedIds, removeBlocklistItems]);

  const handleConfirmRemoveModalClose = useCallback(() => {
    setIsConfirmRemoveModalOpen(false);
  }, []);

  const handleClearBlocklistPress = useCallback(() => {
    setIsConfirmClearModalOpen(true);
  }, []);

  const handleClearBlocklistConfirmed = useCallback(() => {
    executeCommand({ name: commandNames.CLEAR_BLOCKLIST }, () => {
      goToPage(1);
      refetch();
    });

    setIsConfirmClearModalOpen(false);
  }, [executeCommand, goToPage, refetch]);

  const handleConfirmClearModalClose = useCallback(() => {
    setIsConfirmClearModalOpen(false);
  }, []);

  const handleSortPress = useCallback(
    (sortKey: string, sortDirection?: SortDirection) => {
      setBlocklistSort({ sortKey, sortDirection });
    },
    []
  );

  const handleTableOptionChange = useCallback(
    (payload: Partial<BlocklistOptions>) => {
      setBlocklistOptions(payload);

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

  return (
    <PageContent title={translate('Blocklist')}>
      <PageToolbar>
        <PageToolbarSection>
          <PageToolbarButton
            label={translate('RemoveSelected')}
            iconName={icons.REMOVE}
            isDisabled={!selectedIds.length}
            isSpinning={isRemoving}
            onPress={handleRemoveSelectedPress}
          />

          <PageToolbarButton
            label={translate('Clear')}
            iconName={icons.CLEAR}
            isDisabled={!records.length}
            isSpinning={isClearingBlocklistExecuting}
            onPress={handleClearBlocklistPress}
          />
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
        </PageToolbarSection>
      </PageToolbar>

      <PageContentBody>
        <PageHeading
          scope={translate('Activity')}
          title={translate('Blocklist')}
        />

        {isLoading && !isFetched ? <LoadingIndicator /> : null}

        {!isLoading && error ? (
          <Alert kind={kinds.DANGER}>
            {translate('UnableToLoadBlocklist')}
          </Alert>
        ) : null}

        {isFetched && !error && !records.length ? (
          <Alert kind={kinds.INFO}>{translate('NoHistoryBlocklist')}</Alert>
        ) : null}

        {isFetched && !error && !!records.length ? (
          <div>
            <Table
              selectAll={true}
              allSelected={allSelected}
              allUnselected={allUnselected}
              columns={columns}
              pageSize={pageSize}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onTableOptionChange={handleTableOptionChange}
              onSelectAllChange={handleSelectAllChange}
              onSortPress={handleSortPress}
            >
              <TableBody>
                {records.map((item) => {
                  return (
                    <BlocklistRow
                      key={item.id}
                      {...item}
                      isSelected={selectedState[item.id] ?? false}
                      columns={columns}
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
          </div>
        ) : null}
      </PageContentBody>

      <ConfirmModal
        isOpen={isConfirmRemoveModalOpen}
        kind={kinds.DANGER}
        title={translate('RemoveSelected')}
        message={translate('RemoveSelectedItemBlocklistMessageText')}
        confirmLabel={translate('RemoveSelected')}
        onConfirm={handleRemoveSelectedConfirmed}
        onCancel={handleConfirmRemoveModalClose}
      />

      <ConfirmModal
        isOpen={isConfirmClearModalOpen}
        kind={kinds.DANGER}
        title={translate('ClearBlocklist')}
        message={translate('ClearBlocklistMessageText')}
        confirmLabel={translate('Clear')}
        onConfirm={handleClearBlocklistConfirmed}
        onCancel={handleConfirmClearModalClose}
      />
    </PageContent>
  );
}

export default Blocklist;
