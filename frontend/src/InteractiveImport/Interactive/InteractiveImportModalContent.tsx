import { uniqBy } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Author from 'Author/Author';
import Book from 'Book/Book';
import * as commandNames from 'Commands/commandNames';
import { useExecuteCommand } from 'Commands/useCommands';
import SelectInput from 'Components/Form/SelectInput';
import Icon from 'Components/Icon';
import Button from 'Components/Link/Button';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import Menu from 'Components/Menu/Menu';
import MenuButton from 'Components/Menu/MenuButton';
import MenuContent from 'Components/Menu/MenuContent';
import SelectedMenuItem from 'Components/Menu/SelectedMenuItem';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import Column from 'Components/Table/Column';
import Table from 'Components/Table/Table';
import TableBody from 'Components/Table/TableBody';
import usePrevious from 'Helpers/Hooks/usePrevious';
import useSelectState from 'Helpers/Hooks/useSelectState';
import { align, icons, kinds, scrollDirections } from 'Helpers/Props';
import SortDirection from 'Helpers/Props/SortDirection';
import SelectAuthorModal from 'InteractiveImport/Author/SelectAuthorModal';
import SelectBookModal from 'InteractiveImport/Book/SelectBookModal';
import ConfirmImportModal from 'InteractiveImport/Confirmation/ConfirmImportModal';
import SelectEditionModal from 'InteractiveImport/Edition/SelectEditionModal';
import SelectIndexerFlagsModal from 'InteractiveImport/IndexerFlags/SelectIndexerFlagsModal';
import InteractiveImport, {
  ImportMode,
  ManualImportFile,
} from 'InteractiveImport/InteractiveImport';
import {
  setInteractiveImportOption,
  setInteractiveImportSort,
  useInteractiveImportOptions,
} from 'InteractiveImport/interactiveImportOptionsStore';
import SelectQualityModal from 'InteractiveImport/Quality/SelectQualityModal';
import SelectReleaseGroupModal from 'InteractiveImport/ReleaseGroup/SelectReleaseGroupModal';
import useInteractiveImport, {
  useReprocessInteractiveImportItems,
  useUpdateInteractiveImportItems,
} from 'InteractiveImport/useInteractiveImport';
import { QualityModel } from 'Quality/Quality';
import { InputChanged } from 'typings/inputs';
import { SelectStateInputProps } from 'typings/props';
import getErrorMessage from 'Utilities/Object/getErrorMessage';
import translate from 'Utilities/String/translate';
import getSelectedIds from 'Utilities/Table/getSelectedIds';
import InteractiveImportRow from './InteractiveImportRow';
import styles from './InteractiveImportModalContent.css';

type SelectType =
  | 'select'
  | 'author'
  | 'book'
  | 'edition'
  | 'releaseGroup'
  | 'quality'
  | 'indexerFlags';

const COLUMNS: Column[] = [
  {
    name: 'path',
    label: () => translate('Path'),
    isSortable: true,
    isVisible: true,
  },
  {
    name: 'author',
    label: () => translate('Author'),
    isSortable: true,
    isVisible: true,
  },
  {
    name: 'book',
    label: () => translate('Book'),
    isVisible: true,
  },
  {
    name: 'releaseGroup',
    label: () => translate('ReleaseGroup'),
    isVisible: true,
  },
  {
    name: 'quality',
    label: () => translate('Quality'),
    isSortable: true,
    isVisible: true,
  },
  {
    name: 'size',
    label: () => translate('Size'),
    isSortable: true,
    isVisible: true,
  },
  {
    name: 'indexerFlags',
    label: React.createElement(Icon, {
      name: icons.FLAG,
      title: () => translate('IndexerFlags'),
    }),
    isSortable: true,
    isVisible: true,
  },
  {
    name: 'rejections',
    label: React.createElement(Icon, {
      name: icons.DANGER,
      kind: kinds.DANGER,
      title: () => translate('Rejections'),
    }),
    isSortable: true,
    isVisible: true,
  },
];

const importModeOptions = [
  {
    key: 'chooseImportMode',
    value: () => translate('ChooseImportMethod'),
    isDisabled: true,
  },
  { key: 'move', value: () => translate('MoveFiles') },
  { key: 'copy', value: () => translate('HardlinkCopyFiles') },
];

function isValidItem(item: InteractiveImport) {
  return !!(item.author && item.book && item.foreignEditionId && item.quality);
}

export interface InteractiveImportModalContentProps {
  folder?: string;
  downloadId?: string;
  authorId?: number;
  title?: string;
  modalTitle: string;
  allowAuthorChange?: boolean;
  showImportMode?: boolean;
  showFilterExistingFiles?: boolean;
  showReplaceExistingFiles?: boolean;
  filterExistingFiles?: boolean;
  replaceExistingFiles?: boolean;
  onModalClose(): void;
}

// The file list of a manual import (Sonarr's InteractiveImportModalContent with
// Readarr's author, book and edition columns). Every edit is written into the cached
// list and sent back with POST /manualimport for new rejections; Import runs the
// ManualImport command with the selected files.
function InteractiveImportModalContent(
  props: InteractiveImportModalContentProps
) {
  const {
    folder,
    downloadId,
    authorId,
    title,
    modalTitle,
    allowAuthorChange = true,
    showImportMode = true,
    showFilterExistingFiles = false,
    showReplaceExistingFiles = false,
    onModalClose,
  } = props;

  const [filterExistingFiles, setFilterExistingFiles] = useState(
    props.filterExistingFiles ?? true
  );
  const [replaceExistingFiles, setReplaceExistingFiles] = useState(
    props.replaceExistingFiles ?? false
  );

  const params = useMemo(
    () => ({
      folder,
      downloadId,
      authorId,
      filterExistingFiles,
      replaceExistingFiles,
    }),
    [folder, downloadId, authorId, filterExistingFiles, replaceExistingFiles]
  );

  const {
    data: items,
    queryKey,
    isFetching,
    isFetched,
    isSuccess,
    error,
  } = useInteractiveImport(params);

  const { sortKey, sortDirection, importMode } = useInteractiveImportOptions();
  const updateItems = useUpdateInteractiveImportItems();
  const { reprocessInteractiveImportItems, isReprocessing } =
    useReprocessInteractiveImportItems(queryKey);
  const wasReprocessing = usePrevious(isReprocessing);
  const executeCommand = useExecuteCommand();

  const [selectState, setSelectState] = useSelectState();
  const [reprocessingIds, setReprocessingIds] = useState<Set<number>>(
    new Set()
  );
  const [selectModalOpen, setSelectModalOpen] = useState<SelectType | null>(
    null
  );
  const [booksImported, setBooksImported] = useState<Book[]>([]);
  const [isConfirmImportModalOpen, setIsConfirmImportModalOpen] =
    useState(false);
  const [interactiveImportErrorMessage, setInteractiveImportErrorMessage] =
    useState<string | null>(null);

  const { allSelected, allUnselected, selectedState } = selectState;

  const selectedIds = useMemo(
    () => getSelectedIds(selectedState) as number[],
    [selectedState]
  );

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds]
  );

  // Gated on success: a failed load must not drop the selection.
  useEffect(() => {
    if (isSuccess) {
      setSelectState({ type: 'updateItems', items });
    }
  }, [items, isSuccess, setSelectState]);

  useEffect(() => {
    if (!isReprocessing && wasReprocessing) {
      setReprocessingIds(new Set());
    }
  }, [isReprocessing, wasReprocessing]);

  const columns = useMemo(() => {
    const showIndexerFlags = items.some((item) => item.indexerFlags);

    return COLUMNS.map((column) => {
      return column.name === 'indexerFlags' && !showIndexerFlags
        ? { ...column, isVisible: false }
        : column;
    });
  }, [items]);

  const hasInvalidRowsSelected = selectedItems.some(
    (item) => !isValidItem(item)
  );

  // Files of one book must all come from the same edition.
  const hasInconsistentBookReleases = useMemo(() => {
    const editionsByBook = new Map<number, Set<string | undefined>>();

    selectedItems.forEach((item) => {
      const bookId = item.book?.id ?? 0;
      const editions = editionsByBook.get(bookId) ?? new Set();

      editions.add(item.foreignEditionId);
      editionsByBook.set(bookId, editions);
    });

    return Array.from(editionsByBook.values()).some((e) => e.size > 1);
  }, [selectedItems]);

  const importIdsByBook = useMemo(() => {
    return items.reduce<Record<number, number[]>>((acc, item) => {
      if (item.book) {
        acc[item.book.id] = [...(acc[item.book.id] ?? []), item.id];
      }

      return acc;
    }, {});
  }, [items]);

  const editionBooks = useMemo(() => {
    const byBook = new Map<number, { book: Book; matchedEditionId?: string }>();

    items.forEach((item) => {
      if (item.book) {
        byBook.set(item.book.id, {
          book: item.book,
          matchedEditionId: item.foreignEditionId,
        });
      }
    });

    return Array.from(byBook.values());
  }, [items]);

  const bulkSelectOptions = useMemo(() => {
    const options = [
      { key: 'select', value: translate('SelectDropdown'), isDisabled: true },
      { key: 'book', value: translate('SelectBook') },
      { key: 'edition', value: translate('SelectEdition') },
      { key: 'quality', value: translate('SelectQuality') },
      { key: 'releaseGroup', value: translate('SelectReleaseGroup') },
      { key: 'indexerFlags', value: translate('SelectIndexerFlags') },
    ];

    if (allowAuthorChange) {
      options.splice(1, 0, { key: 'author', value: translate('SelectAuthor') });
    }

    return options;
  }, [allowAuthorChange]);

  const selectedItem = selectedItems.length
    ? items.find((item) => item.id === selectedIds[0])
    : undefined;

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

  const handleReprocessItems = useCallback(
    (ids: number[]) => {
      setReprocessingIds((prev) => new Set([...prev, ...ids]));
      reprocessInteractiveImportItems(ids);
    },
    [reprocessInteractiveImportItems]
  );

  const updateSelected = useCallback(
    (updates: Partial<InteractiveImport>) => {
      updateItems(selectedIds, updates);
      handleReprocessItems(selectedIds);
      setSelectModalOpen(null);
    },
    [selectedIds, updateItems, handleReprocessItems]
  );

  const handleSortPress = useCallback(
    (newSortKey: string, newSortDirection?: SortDirection) => {
      setInteractiveImportSort({
        sortKey: newSortKey,
        sortDirection: newSortDirection,
      });
    },
    []
  );

  const handleFilterExistingFilesChange = useCallback((value: string) => {
    setFilterExistingFiles(value !== 'all');
  }, []);

  const handleReplaceExistingFilesChange = useCallback((value: string) => {
    setReplaceExistingFiles(value === 'delete');
  }, []);

  const handleImportModeChange = useCallback(
    ({ value }: InputChanged<ImportMode>) => {
      setInteractiveImportOption('importMode', value);
    },
    []
  );

  const handleSelectModalSelect = useCallback(
    ({ value }: InputChanged<SelectType>) => {
      setSelectModalOpen(value);
    },
    []
  );

  const handleSelectModalClose = useCallback(() => {
    setSelectModalOpen(null);
  }, []);

  const handleAuthorSelect = useCallback(
    (author: Author) => {
      updateSelected({
        author,
        book: undefined,
        foreignEditionId: undefined,
        rejections: [],
      });
    },
    [updateSelected]
  );

  const handleBookSelect = useCallback(
    (book: Book) => {
      updateSelected({ book, foreignEditionId: undefined, rejections: [] });
    },
    [updateSelected]
  );

  // Picking an edition applies to every file of that book and stops the server
  // from switching it back.
  const handleEditionSelect = useCallback(
    (bookId: number, foreignEditionId: string) => {
      const ids = importIdsByBook[bookId] ?? [];

      updateItems(ids, {
        foreignEditionId,
        disableReleaseSwitching: true,
        rejections: [],
      });
      handleReprocessItems(ids);
      setSelectModalOpen(null);
    },
    [importIdsByBook, updateItems, handleReprocessItems]
  );

  const handleReleaseGroupSelect = useCallback(
    (releaseGroup: string) => {
      updateSelected({ releaseGroup });
    },
    [updateSelected]
  );

  const handleQualitySelect = useCallback(
    (quality: QualityModel) => {
      updateSelected({ quality });
    },
    [updateSelected]
  );

  const handleIndexerFlagsSelect = useCallback(
    (indexerFlags: number) => {
      updateSelected({ indexerFlags });
    },
    [updateSelected]
  );

  const handleConfirmImportPress = useCallback(() => {
    const finalImportMode: ImportMode =
      downloadId || !showImportMode ? 'auto' : importMode;

    if (finalImportMode === 'chooseImportMode') {
      setInteractiveImportErrorMessage(
        translate('InteractiveImportNoImportMode')
      );

      return;
    }

    const files: ManualImportFile[] = [];

    for (const item of selectedItems) {
      const {
        author,
        book,
        foreignEditionId,
        quality,
        indexerFlags,
        disableReleaseSwitching,
      } = item;

      if (!author) {
        setInteractiveImportErrorMessage(
          translate('InteractiveImportNoAuthor')
        );
        return;
      }

      if (!book) {
        setInteractiveImportErrorMessage(translate('InteractiveImportNoBook'));
        return;
      }

      if (!quality) {
        setInteractiveImportErrorMessage(
          translate('InteractiveImportNoQuality')
        );
        return;
      }

      files.push({
        path: item.path,
        authorId: author.id,
        bookId: book.id,
        foreignEditionId,
        quality,
        indexerFlags,
        downloadId,
        disableReleaseSwitching,
      });
    }

    if (!files.length) {
      return;
    }

    executeCommand({
      name: commandNames.INTERACTIVE_IMPORT,
      files,
      importMode: finalImportMode,
      replaceExistingFiles,
    });

    onModalClose();
  }, [
    downloadId,
    showImportMode,
    importMode,
    selectedItems,
    replaceExistingFiles,
    executeCommand,
    onModalClose,
  ]);

  const handleImportSelectedPress = useCallback(() => {
    if (!replaceExistingFiles) {
      handleConfirmImportPress();
      return;
    }

    // Existing files of these books may be deleted, so list them first.
    setBooksImported(
      uniqBy(
        selectedItems.flatMap((item) => (item.book ? [item.book] : [])),
        'id'
      )
    );
    setIsConfirmImportModalOpen(true);
  }, [replaceExistingFiles, selectedItems, handleConfirmImportPress]);

  const handleConfirmImportModalClose = useCallback(() => {
    setIsConfirmImportModalOpen(false);
  }, []);

  const errorMessage = getErrorMessage(
    error,
    translate('InteractiveImportLoadError')
  );

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>
        {modalTitle} - {title || folder}
      </ModalHeader>

      <ModalBody scrollDirection={scrollDirections.BOTH}>
        <div className={styles.filterContainer}>
          {showFilterExistingFiles ? (
            <Menu alignMenu={align.RIGHT}>
              <MenuButton>
                <Icon name={icons.FILTER} size={22} />

                <div className={styles.filterText}>
                  {filterExistingFiles
                    ? translate('UnmappedFilesOnly')
                    : translate('AllFiles')}
                </div>
              </MenuButton>

              <MenuContent>
                <SelectedMenuItem
                  name="all"
                  isSelected={!filterExistingFiles}
                  onPress={handleFilterExistingFilesChange}
                >
                  {translate('AllFiles')}
                </SelectedMenuItem>

                <SelectedMenuItem
                  name="new"
                  isSelected={filterExistingFiles}
                  onPress={handleFilterExistingFilesChange}
                >
                  {translate('UnmappedFilesOnly')}
                </SelectedMenuItem>
              </MenuContent>
            </Menu>
          ) : null}

          {showReplaceExistingFiles ? (
            <Menu alignMenu={align.RIGHT}>
              <MenuButton>
                <Icon name={icons.CLONE} size={22} />

                <div className={styles.filterText}>
                  {replaceExistingFiles
                    ? translate('ExistingFilesWillBeDeleted')
                    : translate('CombineWithExistingFiles')}
                </div>
              </MenuButton>

              <MenuContent>
                <SelectedMenuItem
                  name="combine"
                  isSelected={!replaceExistingFiles}
                  onPress={handleReplaceExistingFilesChange}
                >
                  {translate('CombineWithExistingFiles')}
                </SelectedMenuItem>

                <SelectedMenuItem
                  name="delete"
                  isSelected={replaceExistingFiles}
                  onPress={handleReplaceExistingFilesChange}
                >
                  {translate('ReplaceExistingFiles')}
                </SelectedMenuItem>
              </MenuContent>
            </Menu>
          ) : null}
        </div>

        {isFetching ? <LoadingIndicator /> : null}

        {error ? <div>{errorMessage}</div> : null}

        {isFetched && !error && !!items.length && !isFetching ? (
          <Table
            columns={columns}
            horizontalScroll={true}
            selectAll={true}
            allSelected={allSelected}
            allUnselected={allUnselected}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortPress={handleSortPress}
            onSelectAllChange={handleSelectAllChange}
          >
            <TableBody>
              {items.map((item) => {
                return (
                  <InteractiveImportRow
                    key={item.id}
                    item={item}
                    allowAuthorChange={allowAuthorChange}
                    columns={columns}
                    modalTitle={modalTitle}
                    isSelected={!!selectedState[item.id]}
                    isReprocessing={reprocessingIds.has(item.id)}
                    onSelectedChange={handleSelectedChange}
                    onReprocessItems={handleReprocessItems}
                  />
                );
              })}
            </TableBody>
          </Table>
        ) : null}

        {isFetched && !error && !items.length && !isFetching
          ? translate('InteractiveImportNoFilesFound')
          : null}
      </ModalBody>

      <ModalFooter className={styles.footer}>
        <div className={styles.leftButtons}>
          {!downloadId && showImportMode ? (
            <SelectInput
              className={styles.importMode}
              name="importMode"
              value={importMode}
              values={importModeOptions}
              onChange={handleImportModeChange}
            />
          ) : null}

          <SelectInput
            className={styles.bulkSelect}
            name="select"
            value="select"
            values={bulkSelectOptions}
            isDisabled={!selectedIds.length}
            onChange={handleSelectModalSelect}
          />
        </div>

        <div className={styles.rightButtons}>
          <Button onPress={onModalClose}>{translate('Cancel')}</Button>

          {interactiveImportErrorMessage ? (
            <span className={styles.errorMessage}>
              {interactiveImportErrorMessage}
            </span>
          ) : null}

          <Button
            kind={kinds.SUCCESS}
            isDisabled={
              isReprocessing ||
              !selectedIds.length ||
              hasInvalidRowsSelected ||
              hasInconsistentBookReleases
            }
            onPress={handleImportSelectedPress}
          >
            {translate('Import')}
          </Button>
        </div>
      </ModalFooter>

      <SelectAuthorModal
        isOpen={selectModalOpen === 'author'}
        modalTitle={modalTitle}
        onAuthorSelect={handleAuthorSelect}
        onModalClose={handleSelectModalClose}
      />

      <SelectBookModal
        isOpen={selectModalOpen === 'book'}
        authorId={selectedItem?.author?.id}
        modalTitle={modalTitle}
        onBookSelect={handleBookSelect}
        onModalClose={handleSelectModalClose}
      />

      <SelectEditionModal
        isOpen={selectModalOpen === 'edition'}
        books={editionBooks}
        modalTitle={modalTitle}
        onEditionSelect={handleEditionSelect}
        onModalClose={handleSelectModalClose}
      />

      <SelectReleaseGroupModal
        isOpen={selectModalOpen === 'releaseGroup'}
        releaseGroup=""
        modalTitle={modalTitle}
        onReleaseGroupSelect={handleReleaseGroupSelect}
        onModalClose={handleSelectModalClose}
      />

      <SelectQualityModal
        isOpen={selectModalOpen === 'quality'}
        qualityId={0}
        proper={false}
        real={false}
        modalTitle={modalTitle}
        onQualitySelect={handleQualitySelect}
        onModalClose={handleSelectModalClose}
      />

      <SelectIndexerFlagsModal
        isOpen={selectModalOpen === 'indexerFlags'}
        indexerFlags={0}
        modalTitle={modalTitle}
        onIndexerFlagsSelect={handleIndexerFlagsSelect}
        onModalClose={handleSelectModalClose}
      />

      <ConfirmImportModal
        isOpen={isConfirmImportModalOpen}
        books={booksImported}
        onConfirmImportPress={handleConfirmImportPress}
        onModalClose={handleConfirmImportModalClose}
      />
    </ModalContent>
  );
}

export default InteractiveImportModalContent;
