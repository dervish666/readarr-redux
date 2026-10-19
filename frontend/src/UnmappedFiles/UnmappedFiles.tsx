import React, { useCallback, useEffect, useMemo } from 'react';
import BookFile from 'BookFile/BookFile';
import useBookFiles, {
  useDeleteBookFile,
  useDeleteBookFiles,
} from 'BookFile/useBookFiles';
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
import Table from 'Components/Table/Table';
import TableBody from 'Components/Table/TableBody';
import TableOptionsModalWrapper from 'Components/Table/TableOptions/TableOptionsModalWrapper';
import useSelectState from 'Helpers/Hooks/useSelectState';
import { align, icons, kinds } from 'Helpers/Props';
import SortDirection from 'Helpers/Props/SortDirection';
import { SelectStateInputProps } from 'typings/props';
import { sortItems } from 'Utilities/Filter/clientSideFilterAndSort';
import {
  registerPagePopulator,
  unregisterPagePopulator,
} from 'Utilities/pagePopulator';
import translate from 'Utilities/String/translate';
import getSelectedIds from 'Utilities/Table/getSelectedIds';
import {
  setUnmappedFilesOption,
  setUnmappedFilesSort,
  UnmappedFilesOptions,
  useUnmappedFilesOptions,
} from './unmappedFilesOptionsStore';
import UnmappedFilesRow from './UnmappedFilesRow';

const SORT_PREDICATES = {
  quality: (item: BookFile) => (item.quality ? item.qualityWeight : 0),
};

// Files in root folders that match no book: GET /bookfile?unmapped=true. Delete
// Selected removes them with DELETE /bookfile/bulk, Add Missing runs RescanFolders
// adding new authors, and each row can be imported by hand from its folder.
function UnmappedFiles() {
  const { data, isFetched, isSuccess, isLoading, error, refetch } =
    useBookFiles({ unmapped: true });

  const { columns, sortKey, sortDirection } = useUnmappedFilesOptions();
  const [selectState, setSelectState] = useSelectState();
  const { allSelected, allUnselected, selectedState } = selectState;

  const executeCommand = useExecuteCommand();
  const isScanningFolders = useCommandExecuting(commandNames.RESCAN_FOLDERS);

  const handleDeleted = useCallback(() => {
    setSelectState({ type: 'unselectAll', items: [] });
  }, [setSelectState]);

  const { deleteBookFile } = useDeleteBookFile();
  const { deleteBookFiles, isDeleting } = useDeleteBookFiles(handleDeleted);

  // SignalR can merge a file that was matched since into this list, so keep only
  // files that still have no book.
  const items = useMemo(() => {
    return sortItems(
      data.filter((file) => file.bookId === 0),
      { sortKey, sortDirection, sortPredicates: SORT_PREDICATES }
    );
  }, [data, sortKey, sortDirection]);

  const selectedIds = useMemo(
    () => getSelectedIds(selectedState) as number[],
    [selectedState]
  );

  // Gated on success: a failed load must not drop the selection.
  useEffect(() => {
    if (isSuccess) {
      setSelectState({ type: 'updateItems', items });
    }
  }, [items, isSuccess, setSelectState]);

  useEffect(() => {
    const repopulate = () => {
      refetch();
    };

    registerPagePopulator(repopulate, ['bookFileUpdated']);

    return () => {
      unregisterPagePopulator(repopulate);
    };
  }, [refetch]);

  const handleSelectAllChange = useCallback(
    ({ value }: SelectStateInputProps) => {
      setSelectState({ type: value ? 'selectAll' : 'unselectAll', items });
    },
    [items, setSelectState]
  );

  const handleSelectedChange = useCallback(
    ({ id, value, shiftKey = false }: SelectStateInputProps) => {
      setSelectState({
        type: 'toggleSelected',
        items,
        id,
        isSelected: value,
        shiftKey,
      });
    },
    [items, setSelectState]
  );

  const handleSortPress = useCallback(
    (newSortKey: string, newSortDirection?: SortDirection) => {
      setUnmappedFilesSort({
        sortKey: newSortKey,
        sortDirection: newSortDirection,
      });
    },
    []
  );

  const handleTableOptionChange = useCallback(
    ({ columns: newColumns }: Partial<UnmappedFilesOptions>) => {
      if (newColumns) {
        setUnmappedFilesOption('columns', newColumns);
      }
    },
    []
  );

  const handleAddMissingAuthorsPress = useCallback(() => {
    executeCommand({
      name: commandNames.RESCAN_FOLDERS,
      addNewAuthors: true,
      filter: 'matched',
    });
  }, [executeCommand]);

  const handleDeleteSelectedPress = useCallback(() => {
    deleteBookFiles({ bookFileIds: selectedIds });
  }, [selectedIds, deleteBookFiles]);

  return (
    <PageContent title={translate('UnmappedFiles')}>
      <PageToolbar>
        <PageToolbarSection>
          <PageToolbarButton
            label={translate('AddMissing')}
            iconName={icons.ADD_MISSING_AUTHORS}
            isDisabled={isFetched && !error && !items.length}
            isSpinning={isScanningFolders}
            onPress={handleAddMissingAuthorsPress}
          />

          <PageToolbarButton
            label={translate('DeleteSelected')}
            iconName={icons.DELETE}
            isDisabled={!selectedIds.length}
            isSpinning={isDeleting}
            onPress={handleDeleteSelectedPress}
          />
        </PageToolbarSection>

        <PageToolbarSection alignContent={align.RIGHT}>
          <TableOptionsModalWrapper
            columns={columns}
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
          scope={translate('Authors')}
          title={translate('UnmappedFiles')}
        />

        {isLoading ? <LoadingIndicator /> : null}

        {!isLoading && error ? (
          <Alert kind={kinds.DANGER}>
            {translate('LoadingBookFilesFailed')}
          </Alert>
        ) : null}

        {isFetched && !error && !items.length ? (
          <Alert kind={kinds.INFO}>{translate('UnmappedFilesEmpty')}</Alert>
        ) : null}

        {isFetched && !error && !!items.length ? (
          <Table
            columns={columns}
            selectAll={true}
            allSelected={allSelected}
            allUnselected={allUnselected}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onTableOptionChange={handleTableOptionChange}
            onSelectAllChange={handleSelectAllChange}
            onSortPress={handleSortPress}
          >
            <TableBody>
              {items.map((item) => {
                return (
                  <UnmappedFilesRow
                    key={item.id}
                    bookFile={item}
                    columns={columns}
                    isSelected={selectedState[item.id]}
                    onSelectedChange={handleSelectedChange}
                    onDeletePress={deleteBookFile}
                  />
                );
              })}
            </TableBody>
          </Table>
        ) : null}
      </PageContentBody>
    </PageContent>
  );
}

export default UnmappedFiles;
