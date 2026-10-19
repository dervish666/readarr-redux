import React, { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import AppState from 'App/State/AppState';
import Book from 'Book/Book';
import BookCover from 'Book/BookCover';
import CheckInput from 'Components/Form/CheckInput';
import Button from 'Components/Link/Button';
import SpinnerErrorButton from 'Components/Link/SpinnerErrorButton';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import { kinds } from 'Helpers/Props';
import { addBookOptions } from 'Search/addNewOptionsStore';
import AddAuthorOptionsForm, {
  AddNewOptionChanged,
} from 'Search/Common/AddAuthorOptionsForm';
import { getNewBook, useAddBook } from 'Search/useAddNew';
import { InputChanged } from 'typings/inputs';
import selectSettings from 'Utilities/selectSettings';
import stripHtml from 'Utilities/String/stripHtml';
import translate from 'Utilities/String/translate';
import styles from './AddNewBookModalContent.css';

export interface AddNewBookModalContentProps {
  book: Book;
  isExistingAuthor: boolean;
  onModalClose: () => void;
}

// A book by an author not yet in the library adds the author too, so the author
// options are asked for only then.
function AddNewBookModalContent({
  book,
  isExistingAuthor,
  onModalClose,
}: AddNewBookModalContentProps) {
  const { title, seriesTitle, disambiguation, overview, images, author } = book;
  const authorName = author?.authorName ?? '';

  const options = addBookOptions.useOptions();
  const isSmallScreen = useSelector(
    (state: AppState) => state.app.dimensions.isSmallScreen
  );
  const [searchForNewBook, setSearchForNewBook] = useState(false);

  const { addBook, isAdding, addError } = useAddBook(onModalClose);

  const { settings, validationErrors, validationWarnings } = useMemo(
    () => selectSettings(options, {}, addError),
    [options, addError]
  );

  const handleOptionChange = useCallback<AddNewOptionChanged>((name, value) => {
    addBookOptions.setOption(name, value);
  }, []);

  const handleSearchChange = useCallback(({ value }: InputChanged<boolean>) => {
    setSearchForNewBook(value);
  }, []);

  const handleAddPress = useCallback(() => {
    addBook(getNewBook(book, isExistingAuthor, options, searchForNewBook));
  }, [book, isExistingAuthor, options, searchForNewBook, addBook]);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>{translate('AddNewBook')}</ModalHeader>

      <ModalBody>
        <div className={styles.container}>
          {isSmallScreen ? null : (
            <BookCover
              className={styles.poster}
              images={images}
              size={250}
              lazy={false}
            />
          )}

          <div className={styles.info}>
            <div className={styles.name}>
              {title}

              {disambiguation ? (
                <span className={styles.disambiguation}>
                  ({disambiguation})
                </span>
              ) : null}
            </div>

            {seriesTitle ? (
              <div className={styles.series}>{seriesTitle}</div>
            ) : null}

            <div className={styles.authorName}>
              {translate('ByAuthorName', { authorName })}
            </div>

            {overview ? (
              <p className={styles.intro}>{stripHtml(overview)}</p>
            ) : null}

            {isExistingAuthor ? null : (
              <AddAuthorOptionsForm
                settings={settings}
                validationErrors={validationErrors}
                validationWarnings={validationWarnings}
                folder={author?.folder}
                showMetadataProfile={true}
                includeNoneMetadataProfile={true}
                includeSpecificBookMonitor={true}
                onOptionChange={handleOptionChange}
              />
            )}
          </div>
        </div>
      </ModalBody>

      <ModalFooter className={styles.modalFooter}>
        <label className={styles.searchOptions}>
          <span className={styles.searchLabel}>
            {translate('StartSearchForNewBook')}
          </span>

          <CheckInput
            containerClassName={styles.searchOption}
            name="searchForNewBook"
            value={searchForNewBook}
            onChange={handleSearchChange}
          />
        </label>

        <div className={styles.actions}>
          <Button onPress={onModalClose}>{translate('Cancel')}</Button>

          <SpinnerErrorButton
            className={styles.addButton}
            kind={kinds.SUCCESS}
            isSpinning={isAdding}
            error={addError}
            onPress={handleAddPress}
          >
            {translate('AddBookWithTitle', { title })}
          </SpinnerErrorButton>
        </div>
      </ModalFooter>
    </ModalContent>
  );
}

export default AddNewBookModalContent;
