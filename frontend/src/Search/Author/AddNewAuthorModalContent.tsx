import React, { useCallback, useMemo, useState } from 'react';
import { useAppDimension } from 'App/appStore';
import Author from 'Author/Author';
import AuthorPoster from 'Author/AuthorPoster';
import CheckInput from 'Components/Form/CheckInput';
import Button from 'Components/Link/Button';
import SpinnerErrorButton from 'Components/Link/SpinnerErrorButton';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import { kinds } from 'Helpers/Props';
import { addAuthorOptions } from 'Search/addNewOptionsStore';
import AddAuthorOptionsForm, {
  AddNewOptionChanged,
} from 'Search/Common/AddAuthorOptionsForm';
import { getNewAuthor, useAddAuthor } from 'Search/useAddNew';
import { useMetadataProfiles } from 'Settings/Profiles/Metadata/useMetadataProfiles';
import { InputChanged } from 'typings/inputs';
import selectSettings from 'Utilities/selectSettings';
import stripHtml from 'Utilities/String/stripHtml';
import translate from 'Utilities/String/translate';
import styles from './AddNewAuthorModalContent.css';

export interface AddNewAuthorModalContentProps {
  author: Author;
  onModalClose: () => void;
}

function AddNewAuthorModalContent({
  author,
  onModalClose,
}: AddNewAuthorModalContentProps) {
  const { authorName, disambiguation, overview, images, folder } = author;

  const options = addAuthorOptions.useOptions();
  const { data: metadataProfiles } = useMetadataProfiles();
  const isSmallScreen = useAppDimension('isSmallScreen');
  const [searchForMissingBooks, setSearchForMissingBooks] = useState(false);

  const { addAuthor, isAdding, addError } = useAddAuthor(onModalClose);

  const { settings, validationErrors, validationWarnings } = useMemo(
    () => selectSettings(options, {}, addError),
    [options, addError]
  );

  const handleOptionChange = useCallback<AddNewOptionChanged>((name, value) => {
    addAuthorOptions.setOption(name, value);
  }, []);

  const handleSearchChange = useCallback(({ value }: InputChanged<boolean>) => {
    setSearchForMissingBooks(value);
  }, []);

  const handleAddPress = useCallback(() => {
    addAuthor(getNewAuthor(author, options, searchForMissingBooks));
  }, [author, options, searchForMissingBooks, addAuthor]);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>{translate('AddNewAuthor')}</ModalHeader>

      <ModalBody>
        <div className={styles.container}>
          {isSmallScreen ? null : (
            <AuthorPoster
              className={styles.poster}
              images={images}
              size={250}
              lazy={false}
            />
          )}

          <div className={styles.info}>
            <div className={styles.name}>
              {authorName}

              {disambiguation ? (
                <span className={styles.disambiguation}>
                  ({disambiguation})
                </span>
              ) : null}
            </div>

            {overview ? (
              <p className={styles.intro}>{stripHtml(overview)}</p>
            ) : null}

            <AddAuthorOptionsForm
              settings={settings}
              validationErrors={validationErrors}
              validationWarnings={validationWarnings}
              folder={folder}
              // None (not allowed for authors) and one other: nothing to choose.
              showMetadataProfile={metadataProfiles.length > 2}
              includeNoneMetadataProfile={false}
              onOptionChange={handleOptionChange}
            />
          </div>
        </div>
      </ModalBody>

      <ModalFooter className={styles.modalFooter}>
        <label className={styles.searchOptions}>
          <span className={styles.searchLabel}>
            {translate('StartSearchForMissingBooks')}
          </span>

          <CheckInput
            containerClassName={styles.searchOption}
            name="searchForMissingBooks"
            value={searchForMissingBooks}
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
            {translate('AddAuthorWithName', { authorName })}
          </SpinnerErrorButton>
        </div>
      </ModalFooter>
    </ModalContent>
  );
}

export default AddNewAuthorModalContent;
