import React, { useCallback, useEffect, useMemo, useState } from 'react';
import BookFile from 'BookFile/BookFile';
import useBookFiles, {
  useDeleteBookFile,
  useDeleteBookFiles,
  useUpdateBookFiles,
} from 'BookFile/useBookFiles';
import Alert from 'Components/Alert';
import SelectInput from 'Components/Form/SelectInput';
import SpinnerButton from 'Components/Link/SpinnerButton';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import ConfirmModal from 'Components/Modal/ConfirmModal';
import Table from 'Components/Table/Table';
import TableBody from 'Components/Table/TableBody';
import useSelectState from 'Helpers/Hooks/useSelectState';
import { kinds } from 'Helpers/Props';
import SortDirection from 'Helpers/Props/SortDirection';
import { Quality } from 'Quality/Quality';
import { useQualityProfileSchema } from 'Settings/Profiles/Quality/useQualityProfiles';
import { InputChanged } from 'typings/inputs';
import { SelectStateInputProps } from 'typings/props';
import { sortItems } from 'Utilities/Filter/clientSideFilterAndSort';
import getQualities from 'Utilities/Quality/getQualities';
import translate from 'Utilities/String/translate';
import getSelectedIds from 'Utilities/Table/getSelectedIds';
import { bookFileEditorOptions } from './bookFileEditorOptionsStore';
import BookFileEditorRow from './BookFileEditorRow';
import styles from './BookFileEditorTable.css';

const SELECT_QUALITY = 'selectQuality';

const SORT_PREDICATES = {
  quality: (item: BookFile) => (item.quality ? item.qualityWeight : 0),
};

interface BookFileEditorTableProps {
  authorId?: number;
  bookId?: number;
}

// The Files tab of the author and book pages: GET /bookfile by book (a list of one)
// or by author. Delete one file (DELETE /bookfile/{id}), delete the selected files
// (DELETE /bookfile/bulk) or set their quality (PUT /bookfile/editor), both with a
// v1 BookFileListResource. A multi-part audiobook is one row per part file.
function BookFileEditorTable({ authorId, bookId }: BookFileEditorTableProps) {
  const {
    data: bookFiles,
    isFetching,
    isFetched,
    isSuccess,
    error,
  } = useBookFiles(bookId ? { bookId: [bookId] } : { authorId: authorId ?? 0 });

  const { schema, isSchemaFetched, schemaError } =
    useQualityProfileSchema(true);

  const { deleteBookFile } = useDeleteBookFile();
  const { deleteBookFiles, isDeleting } = useDeleteBookFiles();
  const { updateBookFiles } = useUpdateBookFiles();

  const { columns, sortKey, sortDirection } =
    bookFileEditorOptions.useOptions();

  const [selectState, setSelectState] = useSelectState();
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] =
    useState(false);

  const items = useMemo(() => {
    return sortItems(bookFiles, {
      sortKey,
      sortDirection,
      sortPredicates: SORT_PREDICATES,
    });
  }, [bookFiles, sortKey, sortDirection]);

  const qualities: Quality[] = useMemo(
    () => getQualities(schema.items),
    [schema]
  );

  const qualityOptions = useMemo(() => {
    return [
      {
        key: SELECT_QUALITY,
        value: translate('SelectQuality'),
        isDisabled: true,
      },
      ...[...qualities].reverse().map((quality) => ({
        key: quality.id,
        value: quality.name,
      })),
    ];
  }, [qualities]);

  const selectedIds = useMemo(
    () => getSelectedIds(selectState.selectedState) as number[],
    [selectState.selectedState]
  );

  const hasSelectedFiles = selectedIds.length > 0;

  useEffect(() => {
    // A failed load must not drop the selection.
    if (isSuccess) {
      setSelectState({ type: 'updateItems', items });
    }
  }, [items, isSuccess, setSelectState]);

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
      bookFileEditorOptions.setSort({
        sortKey: newSortKey,
        sortDirection: newSortDirection,
      });
    },
    []
  );

  const handleDeletePress = useCallback(() => {
    setIsConfirmDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    setIsConfirmDeleteModalOpen(false);
    deleteBookFiles({ bookFileIds: selectedIds });
  }, [selectedIds, deleteBookFiles]);

  const handleConfirmDeleteModalClose = useCallback(() => {
    setIsConfirmDeleteModalOpen(false);
  }, []);

  const handleQualityChange = useCallback(
    ({ value }: InputChanged) => {
      const quality = qualities.find((q) => q.id === parseInt(String(value)));

      if (!selectedIds.length || !quality) {
        return;
      }

      updateBookFiles({
        bookFileIds: selectedIds,
        quality: {
          quality,
          revision: {
            version: 1,
            real: 0,
            isRepack: false,
          },
        },
      });
    },
    [qualities, selectedIds, updateBookFiles]
  );

  const isPopulated = isFetched && isSchemaFetched;
  const hasError = !!error || !!schemaError;

  return (
    <div className={styles.container}>
      {!isPopulated && !hasError ? <LoadingIndicator /> : null}

      {!isFetching && error ? (
        <Alert kind={kinds.DANGER}>{translate('LoadingBookFilesFailed')}</Alert>
      ) : null}

      {schemaError ? (
        <Alert kind={kinds.DANGER}>{translate('UnableToLoadQualities')}</Alert>
      ) : null}

      {isPopulated && !items.length ? (
        <div className={styles.blankpad}>
          {translate('NoBookFilesToManage')}
        </div>
      ) : null}

      {isPopulated && items.length ? (
        <>
          <div className={styles.filesTable}>
            <Table
              columns={columns}
              selectAll={true}
              allSelected={selectState.allSelected}
              allUnselected={selectState.allUnselected}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSortPress={handleSortPress}
              onSelectAllChange={handleSelectAllChange}
            >
              <TableBody>
                {items.map((item) => {
                  return (
                    <BookFileEditorRow
                      key={item.id}
                      bookFile={item}
                      columns={columns}
                      isSelected={selectState.selectedState[item.id]}
                      onSelectedChange={handleSelectedChange}
                      onDeletePress={deleteBookFile}
                    />
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className={styles.actions}>
            <SpinnerButton
              kind={kinds.DANGER}
              isSpinning={isDeleting}
              isDisabled={!hasSelectedFiles}
              onPress={handleDeletePress}
            >
              {translate('Delete')}
            </SpinnerButton>

            <div className={styles.selectInput}>
              <SelectInput
                name="quality"
                value={SELECT_QUALITY}
                values={qualityOptions}
                isDisabled={!hasSelectedFiles}
                onChange={handleQualityChange}
              />
            </div>
          </div>
        </>
      ) : null}

      <ConfirmModal
        isOpen={isConfirmDeleteModalOpen}
        kind={kinds.DANGER}
        title={translate('DeleteSelectedBookFiles')}
        message={translate('DeleteSelectedBookFilesMessageText')}
        confirmLabel={translate('Delete')}
        onConfirm={handleConfirmDelete}
        onCancel={handleConfirmDeleteModalClose}
      />
    </div>
  );
}

export default BookFileEditorTable;
