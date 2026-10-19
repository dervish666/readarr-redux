import React, { useCallback, useState } from 'react';
import FileDetailsModal from 'BookFile/FileDetailsModal';
import IconButton from 'Components/Link/IconButton';
import ConfirmModal from 'Components/Modal/ConfirmModal';
import TableRowCell from 'Components/Table/Cells/TableRowCell';
import { icons, kinds } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import styles from './BookFileActionsCell.css';

interface BookFileActionsCellProps {
  id: number;
  path?: string;
  onDeletePress: (id: number) => void;
}

function BookFileActionsCell({
  id,
  path,
  onDeletePress,
}: BookFileActionsCellProps) {
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] =
    useState(false);

  const handleDetailsPress = useCallback(() => {
    setIsDetailsModalOpen(true);
  }, []);

  const handleDetailsModalClose = useCallback(() => {
    setIsDetailsModalOpen(false);
  }, []);

  const handleDeletePress = useCallback(() => {
    setIsConfirmDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    setIsConfirmDeleteModalOpen(false);
    onDeletePress(id);
  }, [id, onDeletePress]);

  const handleConfirmDeleteModalClose = useCallback(() => {
    setIsConfirmDeleteModalOpen(false);
  }, []);

  return (
    <TableRowCell className={styles.actionsCell}>
      {path ? (
        <IconButton
          name={icons.INFO}
          title={translate('Details')}
          aria-label={translate('Details')}
          onPress={handleDetailsPress}
        />
      ) : null}

      {path ? (
        <IconButton
          name={icons.DELETE}
          title={translate('DeleteBookFile')}
          aria-label={translate('DeleteBookFile')}
          onPress={handleDeletePress}
        />
      ) : null}

      <FileDetailsModal
        isOpen={isDetailsModalOpen}
        id={id}
        onModalClose={handleDetailsModalClose}
      />

      <ConfirmModal
        isOpen={isConfirmDeleteModalOpen}
        kind={kinds.DANGER}
        title={translate('DeleteBookFile')}
        message={translate('DeleteBookFileMessageText', { 0: path ?? '' })}
        confirmLabel={translate('Delete')}
        onConfirm={handleConfirmDelete}
        onCancel={handleConfirmDeleteModalClose}
      />
    </TableRowCell>
  );
}

export default BookFileActionsCell;
