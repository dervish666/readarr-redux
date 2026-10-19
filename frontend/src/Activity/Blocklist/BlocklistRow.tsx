import React, { useCallback, useState } from 'react';
import AuthorNameLink from 'Author/AuthorNameLink';
import BookFormats from 'Book/BookFormats';
import BookQuality from 'Book/BookQuality';
import IconButton from 'Components/Link/IconButton';
import RelativeDateCellConnector from 'Components/Table/Cells/RelativeDateCellConnector';
import TableRowCell from 'Components/Table/Cells/TableRowCell';
import TableSelectCell from 'Components/Table/Cells/TableSelectCell';
import Column from 'Components/Table/Column';
import TableRow from 'Components/Table/TableRow';
import { icons, kinds } from 'Helpers/Props';
import Blocklist from 'typings/Blocklist';
import { SelectStateInputProps } from 'typings/props';
import translate from 'Utilities/String/translate';
import BlocklistDetailsModal from './BlocklistDetailsModal';
import { useRemoveBlocklistItem } from './useBlocklist';
import styles from './BlocklistRow.module.css';

interface BlocklistRowProps extends Blocklist {
  isSelected: boolean;
  columns: Column[];
  onSelectedChange: (options: SelectStateInputProps) => void;
}

function BlocklistRow({
  id,
  author,
  sourceTitle,
  quality,
  customFormats = [],
  date,
  protocol,
  indexer,
  message,
  isSelected,
  columns,
  onSelectedChange,
}: BlocklistRowProps) {
  const { isRemoving, removeBlocklistItem } = useRemoveBlocklistItem(id);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const handleDetailsPress = useCallback(() => {
    setIsDetailsModalOpen(true);
  }, []);

  const handleDetailsModalClose = useCallback(() => {
    setIsDetailsModalOpen(false);
  }, []);

  const handleRemovePress = useCallback(() => {
    removeBlocklistItem();
  }, [removeBlocklistItem]);

  if (!author) {
    return null;
  }

  return (
    <TableRow>
      <TableSelectCell
        id={id}
        isSelected={isSelected}
        onSelectedChange={onSelectedChange}
      />

      {columns.map((column) => {
        const { name, isVisible } = column;

        if (!isVisible) {
          return null;
        }

        if (name === 'authorMetadata.sortName') {
          return (
            <TableRowCell key={name}>
              <AuthorNameLink
                titleSlug={author.titleSlug}
                authorName={author.authorName}
              />
            </TableRowCell>
          );
        }

        if (name === 'sourceTitle') {
          return <TableRowCell key={name}>{sourceTitle}</TableRowCell>;
        }

        if (name === 'quality') {
          return (
            <TableRowCell key={name} className={styles.quality}>
              <BookQuality quality={quality} />
            </TableRowCell>
          );
        }

        if (name === 'customFormats') {
          return (
            <TableRowCell key={name}>
              <BookFormats formats={customFormats} />
            </TableRowCell>
          );
        }

        if (name === 'date') {
          return <RelativeDateCellConnector key={name} date={date} />;
        }

        if (name === 'indexer') {
          return (
            <TableRowCell key={name} className={styles.indexer}>
              {indexer}
            </TableRowCell>
          );
        }

        if (name === 'actions') {
          return (
            <TableRowCell key={name} className={styles.actions}>
              <IconButton
                name={icons.INFO}
                title={translate('Details')}
                onPress={handleDetailsPress}
              />

              <IconButton
                title={translate('RemoveFromBlocklist')}
                name={icons.REMOVE}
                kind={kinds.DANGER}
                isSpinning={isRemoving}
                onPress={handleRemovePress}
              />
            </TableRowCell>
          );
        }

        return null;
      })}

      <BlocklistDetailsModal
        isOpen={isDetailsModalOpen}
        sourceTitle={sourceTitle}
        protocol={protocol}
        indexer={indexer}
        message={message}
        onModalClose={handleDetailsModalClose}
      />
    </TableRow>
  );
}

export default BlocklistRow;
