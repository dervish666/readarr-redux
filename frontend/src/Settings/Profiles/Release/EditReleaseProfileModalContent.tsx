import React, { useCallback, useEffect } from 'react';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import Button from 'Components/Link/Button';
import SpinnerErrorButton from 'Components/Link/SpinnerErrorButton';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import usePrevious from 'Helpers/Hooks/usePrevious';
import { inputTypes, kinds } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import {
  ReleaseProfileModel,
  useManageReleaseProfile,
} from './useReleaseProfiles';
import styles from './EditReleaseProfileModalContent.module.css';

const tagInputDelimiters = ['Tab', 'Enter'];

interface EditReleaseProfileModalContentProps {
  id?: number;
  onModalClose: () => void;
  onDeleteReleaseProfilePress?: () => void;
}

function EditReleaseProfileModalContent({
  id,
  onModalClose,
  onDeleteReleaseProfilePress,
}: EditReleaseProfileModalContentProps) {
  const {
    item,
    isSaving,
    saveError,
    validationErrors,
    validationWarnings,
    updateValue,
    saveProvider,
  } = useManageReleaseProfile(id);

  const { enabled, required, ignored, indexerId, tags } = item;

  const wasSaving = usePrevious(isSaving);

  const handleInputChange = useCallback(
    ({ name, value }: { name: string; value: unknown }) => {
      updateValue(
        name as keyof ReleaseProfileModel,
        value as ReleaseProfileModel[keyof ReleaseProfileModel]
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
        {id ? translate('EditReleaseProfile') : translate('AddReleaseProfile')}
      </ModalHeader>

      <ModalBody>
        <Form
          validationErrors={validationErrors}
          validationWarnings={validationWarnings}
        >
          <FormGroup>
            <FormLabel>{translate('EnableProfile')}</FormLabel>

            <FormInputGroup
              type={inputTypes.CHECK}
              name="enabled"
              helpText={translate('EnabledHelpText')}
              {...enabled}
              onChange={handleInputChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{translate('MustContain')}</FormLabel>

            <FormInputGroup
              type={inputTypes.TEXT_TAG}
              name="required"
              helpText={translate('RequiredHelpText')}
              {...{
                kind: kinds.SUCCESS,
                placeholder: translate('RequiredPlaceHolder'),
                delimiters: tagInputDelimiters,
              }}
              {...required}
              onChange={handleInputChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{translate('MustNotContain')}</FormLabel>

            <FormInputGroup
              type={inputTypes.TEXT_TAG}
              name="ignored"
              helpText={translate('IgnoredHelpText')}
              {...{
                kind: kinds.DANGER,
                placeholder: translate('IgnoredPlaceHolder'),
                delimiters: tagInputDelimiters,
              }}
              {...ignored}
              onChange={handleInputChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{translate('Indexer')}</FormLabel>

            <FormInputGroup
              type={inputTypes.INDEXER_SELECT}
              name="indexerId"
              helpText={translate('IndexerIdHelpText')}
              helpTextWarning={translate('IndexerIdHelpTextWarning')}
              {...indexerId}
              {...{ includeAny: true }}
              onChange={handleInputChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{translate('Tags')}</FormLabel>

            <FormInputGroup
              type={inputTypes.TAG}
              name="tags"
              helpText={translate('TagsHelpText')}
              {...tags}
              onChange={handleInputChange}
            />
          </FormGroup>
        </Form>
      </ModalBody>

      <ModalFooter>
        {id ? (
          <Button
            className={styles.deleteButton}
            kind={kinds.DANGER}
            onPress={onDeleteReleaseProfilePress}
          >
            {translate('Delete')}
          </Button>
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

export default EditReleaseProfileModalContent;
