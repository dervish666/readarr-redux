import React, { useCallback, useEffect } from 'react';
import Alert from 'Components/Alert';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import Button from 'Components/Link/Button';
import SpinnerErrorButton from 'Components/Link/SpinnerErrorButton';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import usePrevious from 'Helpers/Hooks/usePrevious';
import { inputTypes, kinds } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import {
  MetadataProfileModel,
  useManageMetadataProfile,
  useMetadataProfileInUse,
} from './useMetadataProfiles';
import styles from './EditMetadataProfileModalContent.css';

const ignoredDelimiters = ['Tab', 'Enter', ','];

interface EditMetadataProfileModalContentProps {
  id?: number;
  cloneId?: number;
  onModalClose: () => void;
  onDeleteMetadataProfilePress?: () => void;
}

function EditMetadataProfileModalContent({
  id,
  cloneId,
  onModalClose,
  onDeleteMetadataProfilePress,
}: EditMetadataProfileModalContentProps) {
  const {
    item,
    isSaving,
    saveError,
    validationErrors,
    validationWarnings,
    isSchemaFetched,
    schemaError,
    updateValue,
    saveProvider,
  } = useManageMetadataProfile(id, cloneId);

  const isInUse = useMetadataProfileInUse(id);
  const wasSaving = usePrevious(isSaving);

  const {
    name,
    minPopularity,
    skipMissingDate,
    skipMissingIsbn,
    skipPartsAndSets,
    skipSeriesSecondary,
    allowedLanguages,
    ignored,
    minPages,
  } = item;

  const handleInputChange = useCallback(
    ({ name, value }: { name: string; value: unknown }) => {
      updateValue(
        name as keyof MetadataProfileModel,
        value as MetadataProfileModel[keyof MetadataProfileModel]
      );
    },
    [updateValue]
  );

  useEffect(() => {
    if (wasSaving && !isSaving && !saveError) {
      onModalClose();
    }
  }, [isSaving, wasSaving, saveError, onModalClose]);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>
        {id
          ? translate('EditMetadataProfile')
          : translate('AddMetadataProfile')}
      </ModalHeader>

      <ModalBody>
        {isSchemaFetched ? null : <LoadingIndicator />}

        {isSchemaFetched && schemaError ? (
          <Alert kind={kinds.DANGER}>
            {translate('UnableToAddANewMetadataProfilePleaseTryAgain')}
          </Alert>
        ) : null}

        {isSchemaFetched && !schemaError ? (
          <Form
            validationErrors={validationErrors}
            validationWarnings={validationWarnings}
          >
            <FormGroup>
              <FormLabel>{translate('Name')}</FormLabel>

              <FormInputGroup
                type={inputTypes.TEXT}
                name="name"
                {...name}
                onChange={handleInputChange}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>{translate('MinimumPopularity')}</FormLabel>

              <FormInputGroup
                type={inputTypes.NUMBER}
                name="minPopularity"
                {...minPopularity}
                helpText={translate('MinPopularityHelpText')}
                {...{ isFloat: true, min: 0 }}
                onChange={handleInputChange}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>{translate('MinimumPages')}</FormLabel>

              <FormInputGroup
                type={inputTypes.NUMBER}
                name="minPages"
                {...minPages}
                helpText={translate('MinPagesHelpText')}
                {...{ min: 0 }}
                onChange={handleInputChange}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>
                {translate('SkipBooksWithMissingReleaseDate')}
              </FormLabel>

              <FormInputGroup
                type={inputTypes.CHECK}
                name="skipMissingDate"
                {...skipMissingDate}
                onChange={handleInputChange}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>{translate('SkipBooksWithNoISBNOrASIN')}</FormLabel>

              <FormInputGroup
                type={inputTypes.CHECK}
                name="skipMissingIsbn"
                {...skipMissingIsbn}
                onChange={handleInputChange}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>{translate('SkipPartBooksAndSets')}</FormLabel>

              <FormInputGroup
                type={inputTypes.CHECK}
                name="skipPartsAndSets"
                {...skipPartsAndSets}
                onChange={handleInputChange}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>{translate('SkipSecondarySeriesBooks')}</FormLabel>

              <FormInputGroup
                type={inputTypes.CHECK}
                name="skipSeriesSecondary"
                {...skipSeriesSecondary}
                onChange={handleInputChange}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>{translate('AllowedLanguages')}</FormLabel>

              <FormInputGroup
                type={inputTypes.TEXT}
                name="allowedLanguages"
                {...allowedLanguages}
                helpText={translate('Iso639-3')}
                onChange={handleInputChange}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>{translate('MustNotContain')}</FormLabel>

              <FormInputGroup
                type={inputTypes.TEXT_TAG}
                name="ignored"
                helpText={translate('IgnoredMetaHelpText')}
                {...{
                  kind: kinds.DANGER,
                  placeholder: translate('IgnoredPlaceHolder'),
                  delimiters: ignoredDelimiters,
                }}
                {...ignored}
                onChange={handleInputChange}
              />
            </FormGroup>
          </Form>
        ) : null}
      </ModalBody>

      <ModalFooter>
        {id ? (
          <div
            className={styles.deleteButtonContainer}
            title={
              isInUse
                ? translate(
                    'IsInUseCantDeleteAMetadataProfileThatIsAttachedToAnAuthorOrImportList'
                  )
                : undefined
            }
          >
            <Button
              kind={kinds.DANGER}
              isDisabled={isInUse}
              onPress={onDeleteMetadataProfilePress}
            >
              {translate('Delete')}
            </Button>
          </div>
        ) : null}

        <Button onPress={onModalClose}>{translate('Cancel')}</Button>

        <SpinnerErrorButton
          isSpinning={isSaving}
          error={saveError}
          onPress={saveProvider}
        >
          {translate('Save')}
        </SpinnerErrorButton>
      </ModalFooter>
    </ModalContent>
  );
}

export default EditMetadataProfileModalContent;
