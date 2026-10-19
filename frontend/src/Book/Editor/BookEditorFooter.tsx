import React, { useCallback, useState } from 'react';
import { useBulkDeleteBooks, useSaveBookEditor } from 'Book/useBooks';
import SelectInput from 'Components/Form/SelectInput';
import SpinnerButton from 'Components/Link/SpinnerButton';
import PageContentFooter from 'Components/Page/PageContentFooter';
import { kinds } from 'Helpers/Props';
import { InputChanged } from 'typings/inputs';
import translate from 'Utilities/String/translate';
import BookEditorFooterLabel from './BookEditorFooterLabel';
import DeleteBookModal from './Delete/DeleteBookModal';
import styles from './BookEditorFooter.css';

const NO_CHANGE = 'noChange';

interface BookEditorFooterProps {
  bookIds: number[];
}

// The book editor footer on the book index and the author page's books tab:
// monitor/unmonitor (PUT /book/editor) and delete (DELETE /book/editor).
function BookEditorFooter({ bookIds }: BookEditorFooterProps) {
  const selectedCount = bookIds.length;

  const [monitored, setMonitored] = useState(NO_CHANGE);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleSaved = useCallback(() => setMonitored(NO_CHANGE), []);

  const { saveBookEditor, isSavingBookEditor } = useSaveBookEditor(handleSaved);
  const { bulkDeleteBooks, isBulkDeleting } = useBulkDeleteBooks();

  const handleMonitoredChange = useCallback(
    ({ value }: InputChanged<string>) => {
      setMonitored(value);

      if (value !== NO_CHANGE) {
        saveBookEditor({ bookIds, monitored: value === 'monitored' });
      }
    },
    [bookIds, saveBookEditor]
  );

  const handleDeleteSelectedPress = useCallback(
    (deleteFiles: boolean, addImportListExclusion: boolean) => {
      setIsDeleteModalOpen(false);
      bulkDeleteBooks({ bookIds, deleteFiles, addImportListExclusion });
    },
    [bookIds, bulkDeleteBooks]
  );

  const monitoredOptions = [
    { key: NO_CHANGE, value: translate('NoChange'), isDisabled: true },
    { key: 'monitored', value: translate('Monitored') },
    { key: 'unmonitored', value: translate('Unmonitored') },
  ];

  return (
    <PageContentFooter>
      <div className={styles.inputContainer}>
        <BookEditorFooterLabel
          label={translate('MonitorBook')}
          isSaving={isSavingBookEditor && monitored !== NO_CHANGE}
        />

        <SelectInput
          name="monitored"
          value={monitored}
          values={monitoredOptions}
          isDisabled={!selectedCount}
          onChange={handleMonitoredChange}
        />
      </div>

      <div className={styles.buttonContainer}>
        <div className={styles.buttonContainerContent}>
          <BookEditorFooterLabel
            label={translate('SelectedCountBooksSelectedInterp', {
              0: selectedCount,
            })}
            isSaving={false}
          />

          <div className={styles.buttons}>
            <SpinnerButton
              className={styles.deleteSelectedButton}
              kind={kinds.DANGER}
              isSpinning={isBulkDeleting}
              isDisabled={!selectedCount || isBulkDeleting}
              onPress={() => setIsDeleteModalOpen(true)}
            >
              {translate('Delete')}
            </SpinnerButton>
          </div>
        </div>
      </div>

      <DeleteBookModal
        isOpen={isDeleteModalOpen}
        bookIds={bookIds}
        onDeleteSelectedPress={handleDeleteSelectedPress}
        onModalClose={() => setIsDeleteModalOpen(false)}
      />
    </PageContentFooter>
  );
}

export default BookEditorFooter;
