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
  ImportListExclusionModel,
  useManageImportListExclusion,
} from './useImportListExclusions';
import styles from './EditImportListExclusionModalContent.css';

export interface EditImportListExclusionModalContentProps {
  id?: number;
  onDeleteImportListExclusionPress?: () => void;
  onModalClose: () => void;
}

function EditImportListExclusionModalContent({
  id,
  onDeleteImportListExclusionPress,
  onModalClose,
}: EditImportListExclusionModalContentProps) {
  const {
    item,
    isSaving,
    saveError,
    validationErrors,
    validationWarnings,
    updateValue,
    saveProvider,
  } = useManageImportListExclusion(id);

  const { authorName, foreignId } = item;
  const wasSaving = usePrevious(isSaving);

  const handleInputChange = useCallback(
    ({ name, value }: { name: string; value: unknown }) => {
      updateValue(name as keyof ImportListExclusionModel, value as string);
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
          ? translate('EditImportListExclusion')
          : translate('AddImportListExclusion')}
      </ModalHeader>

      <ModalBody className={styles.body}>
        <Form
          validationErrors={validationErrors}
          validationWarnings={validationWarnings}
        >
          <FormGroup>
            <FormLabel>{translate('EntityName')}</FormLabel>

            <FormInputGroup
              type={inputTypes.TEXT}
              name="authorName"
              helpText={translate('AuthorNameHelpText')}
              {...authorName}
              onChange={handleInputChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{translate('ForeignId')}</FormLabel>

            <FormInputGroup
              type={inputTypes.TEXT}
              name="foreignId"
              helpText={translate('ForeignIdHelpText')}
              {...foreignId}
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
            onPress={onDeleteImportListExclusionPress}
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

export default EditImportListExclusionModalContent;
