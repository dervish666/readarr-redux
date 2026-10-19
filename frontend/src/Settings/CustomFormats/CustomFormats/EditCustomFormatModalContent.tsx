import classNames from 'classnames';
import React, { useCallback, useEffect, useState } from 'react';
import Card from 'Components/Card';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import Icon from 'Components/Icon';
import Button from 'Components/Link/Button';
import SpinnerErrorButton from 'Components/Link/SpinnerErrorButton';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import usePrevious from 'Helpers/Hooks/usePrevious';
import { icons, inputTypes, kinds } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import ImportCustomFormatModal from './ImportCustomFormatModal';
import AddSpecificationModal from './Specifications/AddSpecificationModal';
import EditSpecificationModal from './Specifications/EditSpecificationModal';
import Specification from './Specifications/Specification';
import {
  CustomFormat,
  CustomFormatSpecification,
  useManageCustomFormat,
} from './useCustomFormats';
import styles from './EditCustomFormatModalContent.module.css';

export interface EditCustomFormatModalContentProps {
  id?: number;
  cloneId?: number;
  onDeleteCustomFormatPress?: () => void;
  onModalClose: () => void;
}

interface InputChange {
  name: string;
  value: unknown;
}

function EditCustomFormatModalContent({
  id,
  cloneId,
  onDeleteCustomFormatPress,
  onModalClose,
}: EditCustomFormatModalContentProps) {
  const {
    item,
    validationErrors,
    validationWarnings,
    updateValue,
    saveCustomFormat,
    isSaving,
    saveError,
    specifications,
    saveSpecification,
    deleteSpecification,
    cloneSpecification,
  } = useManageCustomFormat(id, cloneId);

  const [isAddSpecificationModalOpen, setIsAddSpecificationModalOpen] =
    useState(false);
  const [editingSpecification, setEditingSpecification] =
    useState<CustomFormatSpecification | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const { name, includeCustomFormatWhenRenaming } = item;
  const wasSaving = usePrevious(isSaving);

  const handleAddSpecificationPress = useCallback(() => {
    setIsAddSpecificationModalOpen(true);
  }, []);

  // Picking a condition type (or preset) goes straight on to its edit modal.
  const handleAddSpecificationModalClose = useCallback(
    (selectedSpec?: CustomFormatSpecification) => {
      setIsAddSpecificationModalOpen(false);

      if (selectedSpec) {
        setEditingSpecification({ ...selectedSpec, id: 0 });
      }
    },
    []
  );

  const handleNewSpecificationModalClose = useCallback(() => {
    setEditingSpecification(null);
  }, []);

  const handleImportPress = useCallback(() => {
    setIsImportModalOpen(true);
  }, []);

  const handleImportModalClose = useCallback(() => {
    setIsImportModalOpen(false);
  }, []);

  const handleImport = useCallback(
    (imported: CustomFormat) => {
      updateValue('name', imported.name);
      updateValue(
        'includeCustomFormatWhenRenaming',
        imported.includeCustomFormatWhenRenaming
      );
      updateValue(
        'specifications',
        imported.specifications.map((spec, index) => ({
          ...spec,
          id: index + 1,
        }))
      );
    },
    [updateValue]
  );

  const handleInputChange = useCallback(
    ({ name: key, value }: InputChange) => {
      updateValue(
        key as keyof CustomFormat,
        value as CustomFormat[keyof CustomFormat]
      );
    },
    [updateValue]
  );

  const handleSavePress = useCallback(() => {
    saveCustomFormat();
  }, [saveCustomFormat]);

  useEffect(() => {
    if (wasSaving && !isSaving && !saveError) {
      onModalClose();
    }
  }, [isSaving, wasSaving, saveError, onModalClose]);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>
        {id ? translate('EditCustomFormat') : translate('AddCustomFormat')}
      </ModalHeader>

      <ModalBody>
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
            <FormLabel>
              {translate('IncludeCustomFormatWhenRenaming')}
            </FormLabel>

            <FormInputGroup
              type={inputTypes.CHECK}
              name="includeCustomFormatWhenRenaming"
              helpText={translate('IncludeCustomFormatWhenRenamingHelpText')}
              {...includeCustomFormatWhenRenaming}
              onChange={handleInputChange}
            />
          </FormGroup>
        </Form>

        <div className={styles.conditions}>
          <h3 className={styles.conditionsTitle}>{translate('Conditions')}</h3>

          <p className={styles.intro}>
            {translate('CustomFormatsSettingsTriggerInfo')}
          </p>

          <div className={styles.specifications}>
            {specifications.map((specification) => (
              <Specification
                key={specification.id}
                {...specification}
                onSaveSpecification={saveSpecification}
                onCloneSpecificationPress={cloneSpecification}
                onConfirmDeleteSpecification={deleteSpecification}
              />
            ))}

            <Card
              className={classNames(
                styles.addSpecification,
                !specifications.length && styles.fullWidth
              )}
              aria-label={translate('AddCondition')}
              onPress={handleAddSpecificationPress}
            >
              <div className={styles.center}>
                <Icon name={icons.ADD} size={20} />
              </div>

              <div className={styles.addLabel}>{translate('AddCondition')}</div>
            </Card>
          </div>
        </div>

        <AddSpecificationModal
          isOpen={isAddSpecificationModalOpen}
          onModalClose={handleAddSpecificationModalClose}
        />

        {editingSpecification ? (
          <EditSpecificationModal
            isOpen={true}
            specification={editingSpecification}
            onSave={saveSpecification}
            onModalClose={handleNewSpecificationModalClose}
          />
        ) : null}

        <ImportCustomFormatModal
          isOpen={isImportModalOpen}
          onImport={handleImport}
          onModalClose={handleImportModalClose}
        />
      </ModalBody>

      <ModalFooter>
        <div className={styles.leftButtons}>
          {id ? (
            <Button kind={kinds.DANGER} onPress={onDeleteCustomFormatPress}>
              {translate('Delete')}
            </Button>
          ) : null}

          <Button onPress={handleImportPress}>{translate('Import')}</Button>
        </div>

        <Button onPress={onModalClose}>{translate('Cancel')}</Button>

        <SpinnerErrorButton
          isSpinning={isSaving}
          error={saveError}
          onPress={handleSavePress}
        >
          {translate('Save')}
        </SpinnerErrorButton>
      </ModalFooter>
    </ModalContent>
  );
}

export default EditCustomFormatModalContent;
