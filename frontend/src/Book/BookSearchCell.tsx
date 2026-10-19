import React, { useCallback, useState } from 'react';
import * as commandNames from 'Commands/commandNames';
import { useCommandExecuting, useExecuteCommand } from 'Commands/useCommands';
import IconButton from 'Components/Link/IconButton';
import SpinnerIconButton from 'Components/Link/SpinnerIconButton';
import TableRowCell from 'Components/Table/Cells/TableRowCell';
import { icons } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import BookInteractiveSearchModal from './Search/BookInteractiveSearchModal';
import styles from './BookSearchCell.module.css';

interface BookSearchCellProps {
  bookId: number;
  bookTitle: string;
  authorName: string;
}

// The search buttons of the author page's book rows and the wanted lists: an
// automatic BookSearch command, or the interactive search modal.
function BookSearchCell({
  bookId,
  bookTitle,
  authorName,
}: BookSearchCellProps) {
  const executeCommand = useExecuteCommand();
  const isSearching = useCommandExecuting(commandNames.BOOK_SEARCH, {
    bookIds: [bookId],
  });

  const [isInteractiveSearchOpen, setIsInteractiveSearchOpen] = useState(false);

  const handleSearchPress = useCallback(() => {
    executeCommand({
      name: commandNames.BOOK_SEARCH,
      bookIds: [bookId],
    });
  }, [bookId, executeCommand]);

  const handleInteractiveSearchPress = useCallback(() => {
    setIsInteractiveSearchOpen(true);
  }, []);

  const handleInteractiveSearchClose = useCallback(() => {
    setIsInteractiveSearchOpen(false);
  }, []);

  return (
    <TableRowCell className={styles.bookSearchCell}>
      <SpinnerIconButton
        name={icons.SEARCH}
        aria-label={translate('AutomaticSearch')}
        isSpinning={isSearching}
        onPress={handleSearchPress}
      />

      <IconButton
        name={icons.INTERACTIVE}
        aria-label={translate('InteractiveSearch')}
        onPress={handleInteractiveSearchPress}
      />

      <BookInteractiveSearchModal
        isOpen={isInteractiveSearchOpen}
        bookId={bookId}
        bookTitle={bookTitle}
        authorName={authorName}
        onModalClose={handleInteractiveSearchClose}
      />
    </TableRowCell>
  );
}

export default BookSearchCell;
