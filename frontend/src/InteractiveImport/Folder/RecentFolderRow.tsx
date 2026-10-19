import React, { SyntheticEvent, useCallback } from 'react';
import IconButton from 'Components/Link/IconButton';
import RelativeDateCellConnector from 'Components/Table/Cells/RelativeDateCellConnector';
import TableRowCell from 'Components/Table/Cells/TableRowCell';
import TableRowButton from 'Components/Table/TableRowButton';
import { icons } from 'Helpers/Props';
import { removeRecentFolder } from 'InteractiveImport/interactiveImportFoldersStore';
import translate from 'Utilities/String/translate';
import styles from './RecentFolderRow.css';

interface RecentFolderRowProps {
  folder: string;
  lastUsed: string;
  onPress(folder: string): void;
}

function RecentFolderRow({ folder, lastUsed, onPress }: RecentFolderRowProps) {
  const handlePress = useCallback(() => {
    onPress(folder);
  }, [folder, onPress]);

  const handleRemovePress = useCallback(
    (event: SyntheticEvent) => {
      event.stopPropagation();

      removeRecentFolder(folder);
    },
    [folder]
  );

  return (
    <TableRowButton onPress={handlePress}>
      <TableRowCell>{folder}</TableRowCell>

      <RelativeDateCellConnector date={lastUsed} />

      <TableRowCell className={styles.actions}>
        <IconButton
          title={translate('Remove')}
          aria-label={translate('Remove')}
          name={icons.REMOVE}
          onPress={handleRemovePress}
        />
      </TableRowCell>
    </TableRowButton>
  );
}

export default RecentFolderRow;
