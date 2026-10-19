import React, { useCallback, useEffect, useState } from 'react';
import Author from 'Author/Author';
import Book from 'Book/Book';
import BookQuality from 'Book/BookQuality';
import IndexerFlags from 'Book/IndexerFlags';
import FileDetails from 'BookFile/FileDetails';
import Icon from 'Components/Icon';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import ConfirmModal from 'Components/Modal/ConfirmModal';
import TableRowCell from 'Components/Table/Cells/TableRowCell';
import TableRowCellButton from 'Components/Table/Cells/TableRowCellButton';
import TableSelectCell from 'Components/Table/Cells/TableSelectCell';
import Column from 'Components/Table/Column';
import TableRow from 'Components/Table/TableRow';
import Popover from 'Components/Tooltip/Popover';
import Tooltip from 'Components/Tooltip/Tooltip';
import { icons, kinds, sizes, tooltipPositions } from 'Helpers/Props';
import SelectAuthorModal from 'InteractiveImport/Author/SelectAuthorModal';
import SelectBookModal from 'InteractiveImport/Book/SelectBookModal';
import SelectIndexerFlagsModal from 'InteractiveImport/IndexerFlags/SelectIndexerFlagsModal';
import InteractiveImport from 'InteractiveImport/InteractiveImport';
import SelectQualityModal from 'InteractiveImport/Quality/SelectQualityModal';
import SelectReleaseGroupModal from 'InteractiveImport/ReleaseGroup/SelectReleaseGroupModal';
import { useUpdateInteractiveImportItems } from 'InteractiveImport/useInteractiveImport';
import { QualityModel } from 'Quality/Quality';
import { SelectStateInputProps } from 'typings/props';
import formatBytes from 'Utilities/Number/formatBytes';
import translate from 'Utilities/String/translate';
import InteractiveImportRowCellPlaceholder from './InteractiveImportRowCellPlaceholder';
import styles from './InteractiveImportRow.css';

type SelectType =
  | 'author'
  | 'book'
  | 'releaseGroup'
  | 'quality'
  | 'indexerFlags'
  | 'details';

interface InteractiveImportRowProps {
  item: InteractiveImport;
  allowAuthorChange: boolean;
  columns: Column[];
  modalTitle: string;
  isSelected: boolean;
  isReprocessing: boolean;
  onSelectedChange(change: SelectStateInputProps): void;
  onReprocessItems(ids: number[]): void;
}

function InteractiveImportRow({
  item,
  allowAuthorChange,
  columns,
  modalTitle,
  isSelected,
  isReprocessing,
  onSelectedChange,
  onReprocessItems,
}: InteractiveImportRowProps) {
  const {
    id,
    path,
    author,
    book,
    foreignEditionId,
    quality,
    releaseGroup,
    size,
    indexerFlags,
    rejections,
    audioTags,
    additionalFile,
  } = item;

  const updateItems = useUpdateInteractiveImportItems();
  const [selectModalOpen, setSelectModalOpen] = useState<SelectType | null>(
    null
  );

  // A row that is ready to import starts selected.
  useEffect(
    () => {
      if (author && book && foreignEditionId && quality && size > 0) {
        onSelectedChange({ id, value: true, shiftKey: false });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const isIndexerFlagsColumnVisible =
    columns.find((c) => c.name === 'indexerFlags')?.isVisible ?? false;

  const updateAndReprocess = useCallback(
    (updates: Partial<InteractiveImport>) => {
      updateItems([id], updates);
      onReprocessItems([id]);
      setSelectModalOpen(null);

      if (!isSelected) {
        onSelectedChange({ id, value: true, shiftKey: false });
      }
    },
    [id, isSelected, updateItems, onReprocessItems, onSelectedChange]
  );

  const handleSelectModalClose = useCallback(() => {
    setSelectModalOpen(null);
  }, []);

  const handleDetailsPress = useCallback(() => {
    setSelectModalOpen('details');
  }, []);

  const handleSelectAuthorPress = useCallback(() => {
    setSelectModalOpen('author');
  }, []);

  const handleSelectBookPress = useCallback(() => {
    setSelectModalOpen('book');
  }, []);

  const handleSelectReleaseGroupPress = useCallback(() => {
    setSelectModalOpen('releaseGroup');
  }, []);

  const handleSelectQualityPress = useCallback(() => {
    setSelectModalOpen('quality');
  }, []);

  const handleSelectIndexerFlagsPress = useCallback(() => {
    setSelectModalOpen('indexerFlags');
  }, []);

  const handleAuthorSelect = useCallback(
    (newAuthor: Author) => {
      updateAndReprocess({
        author: newAuthor,
        book: undefined,
        foreignEditionId: undefined,
        rejections: [],
      });
    },
    [updateAndReprocess]
  );

  const handleBookSelect = useCallback(
    (newBook: Book) => {
      updateAndReprocess({
        book: newBook,
        foreignEditionId: undefined,
        rejections: [],
      });
    },
    [updateAndReprocess]
  );

  const handleReleaseGroupSelect = useCallback(
    (newReleaseGroup: string) => {
      updateAndReprocess({ releaseGroup: newReleaseGroup });
    },
    [updateAndReprocess]
  );

  const handleQualitySelect = useCallback(
    (newQuality: QualityModel) => {
      updateAndReprocess({ quality: newQuality });
    },
    [updateAndReprocess]
  );

  const handleIndexerFlagsSelect = useCallback(
    (newIndexerFlags: number) => {
      updateAndReprocess({ indexerFlags: newIndexerFlags });
    },
    [updateAndReprocess]
  );

  const authorName = author ? author.authorName : '';
  let bookTitle = '';

  if (book) {
    bookTitle = book.disambiguation
      ? `${book.title} (${book.disambiguation})`
      : book.title;
  }

  const showAuthorPlaceholder = isSelected && !author;
  const showBookPlaceholder =
    !isReprocessing && isSelected && !!author && !book;
  const showReleaseGroupPlaceholder = isSelected && !releaseGroup;
  const showQualityPlaceholder = isSelected && !quality;
  const showIndexerFlagsPlaceholder = isSelected && !indexerFlags;

  const pathCellContents = <div onClick={handleDetailsPress}>{path}</div>;

  return (
    <TableRow className={additionalFile ? styles.additionalFile : undefined}>
      <TableSelectCell
        id={id}
        isSelected={isSelected}
        onSelectedChange={onSelectedChange}
      />

      <TableRowCell className={styles.path} title={path}>
        {additionalFile ? (
          <Tooltip
            anchor={pathCellContents}
            tooltip={translate('InteractiveImportAdditionalFile')}
            position={tooltipPositions.TOP}
          />
        ) : (
          pathCellContents
        )}
      </TableRowCell>

      <TableRowCellButton
        isDisabled={!allowAuthorChange}
        title={
          allowAuthorChange
            ? translate('AllowAuthorChangeClickToChangeAuthor')
            : undefined
        }
        onPress={handleSelectAuthorPress}
      >
        {showAuthorPlaceholder ? (
          <InteractiveImportRowCellPlaceholder />
        ) : (
          authorName
        )}
      </TableRowCellButton>

      <TableRowCellButton
        isDisabled={!author}
        title={author ? translate('AuthorClickToChangeBook') : undefined}
        onPress={handleSelectBookPress}
      >
        {showBookPlaceholder ? (
          <InteractiveImportRowCellPlaceholder />
        ) : (
          bookTitle
        )}

        {isReprocessing && !book ? (
          <LoadingIndicator className={styles.reprocessing} size={20} />
        ) : null}
      </TableRowCellButton>

      <TableRowCellButton
        title={translate('ClickToChangeReleaseGroup')}
        onPress={handleSelectReleaseGroupPress}
      >
        {showReleaseGroupPlaceholder ? (
          <InteractiveImportRowCellPlaceholder isOptional={true} />
        ) : (
          releaseGroup
        )}
      </TableRowCellButton>

      <TableRowCellButton
        className={styles.quality}
        title={translate('ClickToChangeQuality')}
        onPress={handleSelectQualityPress}
      >
        {showQualityPlaceholder ? (
          <InteractiveImportRowCellPlaceholder />
        ) : null}

        {!showQualityPlaceholder && !!quality ? (
          <BookQuality className={styles.label} quality={quality} />
        ) : null}
      </TableRowCellButton>

      <TableRowCell>{formatBytes(size)}</TableRowCell>

      {isIndexerFlagsColumnVisible ? (
        <TableRowCellButton
          title={translate('ClickToChangeIndexerFlags')}
          onPress={handleSelectIndexerFlagsPress}
        >
          {showIndexerFlagsPlaceholder ? (
            <InteractiveImportRowCellPlaceholder isOptional={true} />
          ) : null}

          {!showIndexerFlagsPlaceholder && indexerFlags ? (
            <Popover
              anchor={<Icon name={icons.FLAG} kind={kinds.PRIMARY} />}
              title={translate('IndexerFlags')}
              body={<IndexerFlags indexerFlags={indexerFlags} />}
              position={tooltipPositions.LEFT}
            />
          ) : null}
        </TableRowCellButton>
      ) : null}

      <TableRowCell>
        {rejections.length ? (
          <Popover
            anchor={<Icon name={icons.DANGER} kind={kinds.DANGER} />}
            title={translate('ReleaseRejected')}
            body={
              <ul>
                {rejections.map((rejection, index) => {
                  return <li key={index}>{rejection.reason}</li>;
                })}
              </ul>
            }
            position={tooltipPositions.LEFT}
            canFlip={false}
          />
        ) : null}
      </TableRowCell>

      <ConfirmModal
        isOpen={selectModalOpen === 'details'}
        title={translate('FileDetails')}
        message={<FileDetails audioTags={audioTags ?? {}} filename={path} />}
        size={sizes.LARGE}
        kind={kinds.DEFAULT}
        hideCancelButton={true}
        confirmLabel={translate('Close')}
        onConfirm={handleSelectModalClose}
        onCancel={handleSelectModalClose}
      />

      <SelectAuthorModal
        isOpen={selectModalOpen === 'author'}
        modalTitle={modalTitle}
        onAuthorSelect={handleAuthorSelect}
        onModalClose={handleSelectModalClose}
      />

      <SelectBookModal
        isOpen={selectModalOpen === 'book'}
        authorId={author?.id}
        modalTitle={modalTitle}
        onBookSelect={handleBookSelect}
        onModalClose={handleSelectModalClose}
      />

      <SelectReleaseGroupModal
        isOpen={selectModalOpen === 'releaseGroup'}
        releaseGroup={releaseGroup ?? ''}
        modalTitle={modalTitle}
        onReleaseGroupSelect={handleReleaseGroupSelect}
        onModalClose={handleSelectModalClose}
      />

      <SelectQualityModal
        isOpen={selectModalOpen === 'quality'}
        qualityId={quality ? quality.quality.id : 0}
        proper={quality ? quality.revision.version > 1 : false}
        real={quality ? quality.revision.real > 0 : false}
        modalTitle={modalTitle}
        onQualitySelect={handleQualitySelect}
        onModalClose={handleSelectModalClose}
      />

      <SelectIndexerFlagsModal
        isOpen={selectModalOpen === 'indexerFlags'}
        indexerFlags={indexerFlags ?? 0}
        modalTitle={modalTitle}
        onIndexerFlagsSelect={handleIndexerFlagsSelect}
        onModalClose={handleSelectModalClose}
      />
    </TableRow>
  );
}

export default InteractiveImportRow;
