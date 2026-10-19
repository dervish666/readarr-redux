import React, { useCallback, useState } from 'react';
import BookQuality from 'Book/BookQuality';
import BookFile from 'BookFile/BookFile';
import FileDetailsModal from 'BookFile/FileDetailsModal';
import IconButton from 'Components/Link/IconButton';
import ConfirmModal from 'Components/Modal/ConfirmModal';
import RelativeDateCellConnector from 'Components/Table/Cells/RelativeDateCellConnector';
import TableRowCell from 'Components/Table/Cells/TableRowCell';
import TableSelectCell from 'Components/Table/Cells/TableSelectCell';
import Column from 'Components/Table/Column';
import TableRow from 'Components/Table/TableRow';
import { icons, kinds } from 'Helpers/Props';
import InteractiveImportModal from 'InteractiveImport/InteractiveImportModal';
import { SelectStateInputProps } from 'typings/props';
import formatBytes from 'Utilities/Number/formatBytes';
import translate from 'Utilities/String/translate';
import styles from './UnmappedFilesRow.css';

type ModalType = 'details' | 'interactiveImport' | 'delete';

interface UnmappedFilesRowProps {
  bookFile: BookFile;
  columns: Column[];
  isSelected?: boolean;
  onSelectedChange(change: SelectStateInputProps): void;
  onDeletePress(id: number): void;
}

function UnmappedFilesRow({
  bookFile,
  columns,
  isSelected,
  onSelectedChange,
  onDeletePress,
}: UnmappedFilesRowProps) {
  const { id, path, size, dateAdded, quality } = bookFile;
  const [openModal, setOpenModal] = useState<ModalType | null>(null);

  // Manual import looks at the file's folder.
  const folder = path.substring(
    0,
    Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  );

  const handleDetailsPress = useCallback(() => {
    setOpenModal('details');
  }, []);

  const handleInteractiveImportPress = useCallback(() => {
    setOpenModal('interactiveImport');
  }, []);

  const handleDeletePress = useCallback(() => {
    setOpenModal('delete');
  }, []);

  const handleModalClose = useCallback(() => {
    setOpenModal(null);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    setOpenModal(null);
    onDeletePress(id);
  }, [id, onDeletePress]);

  return (
    <TableRow>
      <TableSelectCell
        id={id}
        isSelected={!!isSelected}
        onSelectedChange={onSelectedChange}
      />

      {columns.map(({ name, isVisible }) => {
        if (!isVisible) {
          return null;
        }

        if (name === 'path') {
          return (
            <TableRowCell key={name} className={styles.path}>
              {path}
            </TableRowCell>
          );
        }

        if (name === 'size') {
          return (
            <TableRowCell key={name} className={styles.size}>
              {formatBytes(size)}
            </TableRowCell>
          );
        }

        if (name === 'dateAdded') {
          return (
            <RelativeDateCellConnector
              key={name}
              className={styles.dateAdded}
              date={dateAdded}
            />
          );
        }

        if (name === 'quality') {
          return (
            <TableRowCell key={name} className={styles.quality}>
              <BookQuality quality={quality} />
            </TableRowCell>
          );
        }

        if (name === 'actions') {
          return (
            <TableRowCell key={name} className={styles.actions}>
              <IconButton
                name={icons.INFO}
                title={translate('Details')}
                aria-label={translate('Details')}
                onPress={handleDetailsPress}
              />

              <IconButton
                name={icons.INTERACTIVE}
                title={translate('ManualImport')}
                aria-label={translate('ManualImport')}
                onPress={handleInteractiveImportPress}
              />

              <IconButton
                name={icons.DELETE}
                title={translate('DeleteBookFile')}
                aria-label={translate('DeleteBookFile')}
                onPress={handleDeletePress}
              />
            </TableRowCell>
          );
        }

        return null;
      })}

      <InteractiveImportModal
        isOpen={openModal === 'interactiveImport'}
        folder={folder}
        showFilterExistingFiles={true}
        filterExistingFiles={false}
        showImportMode={false}
        showReplaceExistingFiles={false}
        replaceExistingFiles={false}
        onModalClose={handleModalClose}
      />

      <FileDetailsModal
        isOpen={openModal === 'details'}
        id={id}
        onModalClose={handleModalClose}
      />

      <ConfirmModal
        isOpen={openModal === 'delete'}
        kind={kinds.DANGER}
        title={translate('DeleteBookFile')}
        message={translate('DeleteBookFileMessageText', { 0: path })}
        confirmLabel={translate('Delete')}
        onConfirm={handleConfirmDelete}
        onCancel={handleModalClose}
      />
    </TableRow>
  );
}

export default UnmappedFilesRow;
