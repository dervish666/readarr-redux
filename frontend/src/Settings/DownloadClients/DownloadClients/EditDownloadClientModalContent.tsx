import React, { useCallback, useEffect } from 'react';
import Alert from 'Components/Alert';
import FieldSet from 'Components/FieldSet';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import ProviderFieldFormGroup from 'Components/Form/ProviderFieldFormGroup';
import Button from 'Components/Link/Button';
import SpinnerErrorButton from 'Components/Link/SpinnerErrorButton';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import usePrevious from 'Helpers/Hooks/usePrevious';
import { inputTypes, kinds, sizes } from 'Helpers/Props';
import AdvancedSettingsButton from 'Settings/AdvancedSettingsButton';
import { useShowAdvancedSettings } from 'Settings/advancedSettingsStore';
import { SelectedSchema } from 'Settings/useProviderSchema';
import translate from 'Utilities/String/translate';
import {
  DownloadClientModel,
  useManageDownloadClient,
} from './useDownloadClients';
import styles from './EditDownloadClientModalContent.module.css';

export interface EditDownloadClientModalContentProps {
  id?: number;
  selectedSchema?: SelectedSchema;
  onModalClose: () => void;
  onDeleteDownloadClientPress?: () => void;
}

interface InputChange {
  name: string;
  value: unknown;
}

interface FieldChange extends InputChange {
  additionalProperties?: Record<string, unknown>;
}

function EditDownloadClientModalContent({
  id,
  selectedSchema,
  onModalClose,
  onDeleteDownloadClientPress,
}: EditDownloadClientModalContentProps) {
  const advancedSettings = useShowAdvancedSettings();

  const {
    item,
    updateFieldValue,
    updateValue,
    saveProvider,
    isSaving,
    saveError,
    testProvider,
    isTesting,
    validationErrors,
    validationWarnings,
  } = useManageDownloadClient(id, selectedSchema);

  const wasSaving = usePrevious(isSaving);

  const {
    implementationName = '',
    name,
    enable,
    protocol,
    priority,
    removeCompletedDownloads,
    removeFailedDownloads,
    fields,
    tags,
    message,
  } = item;

  const handleInputChange = useCallback(
    ({ name, value }: InputChange) => {
      updateValue(
        name as keyof DownloadClientModel,
        value as DownloadClientModel[keyof DownloadClientModel]
      );
    },
    [updateValue]
  );

  const handleFieldChange = useCallback(
    ({ name, value, additionalProperties }: FieldChange) => {
      updateFieldValue({ [name]: value, ...additionalProperties });
    },
    [updateFieldValue]
  );

  useEffect(() => {
    if (!isSaving && wasSaving && !saveError) {
      onModalClose();
    }
  }, [isSaving, wasSaving, saveError, onModalClose]);

  // The schema list loads after the modal opens; nothing to edit until it has.
  if (!name) {
    return (
      <ModalContent onModalClose={onModalClose}>
        <ModalHeader>{translate('AddDownloadClient')}</ModalHeader>
        <ModalBody>{null}</ModalBody>
      </ModalContent>
    );
  }

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>
        {id
          ? translate('EditDownloadClientImplementation', {
              implementationName,
            })
          : translate('AddDownloadClientImplementation', {
              implementationName,
            })}
      </ModalHeader>

      <ModalBody>
        <Form
          validationErrors={validationErrors}
          validationWarnings={validationWarnings}
        >
          {message?.value ? (
            <Alert className={styles.message} kind={message.value.type}>
              {message.value.message}
            </Alert>
          ) : null}

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
            <FormLabel>{translate('Enable')}</FormLabel>

            <FormInputGroup
              type={inputTypes.CHECK}
              name="enable"
              {...enable}
              onChange={handleInputChange}
            />
          </FormGroup>

          {fields.map((field) => {
            return (
              <ProviderFieldFormGroup
                key={field.name}
                advancedSettings={advancedSettings}
                provider="downloadClient"
                providerData={item}
                {...field}
                onChange={handleFieldChange}
              />
            );
          })}

          <FormGroup advancedSettings={advancedSettings} isAdvanced={true}>
            <FormLabel>{translate('ClientPriority')}</FormLabel>

            <FormInputGroup
              type={inputTypes.NUMBER}
              name="priority"
              helpText={translate('IndexerPriorityHelpText')}
              min={1}
              max={50}
              {...priority}
              onChange={handleInputChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{translate('Tags')}</FormLabel>

            <FormInputGroup
              type={inputTypes.TAG}
              name="tags"
              helpText={translate('DownloadClientTagHelpText')}
              {...tags}
              onChange={handleInputChange}
            />
          </FormGroup>

          <FieldSet
            size={sizes.SMALL}
            legend={translate('CompletedDownloadHandling')}
          >
            <FormGroup>
              <FormLabel>{translate('RemoveCompleted')}</FormLabel>

              <FormInputGroup
                type={inputTypes.CHECK}
                name="removeCompletedDownloads"
                helpText={translate('RemoveCompletedDownloadsHelpText')}
                {...removeCompletedDownloads}
                onChange={handleInputChange}
              />
            </FormGroup>

            {protocol.value === 'torrent' ? null : (
              <FormGroup>
                <FormLabel>{translate('RemoveFailed')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.CHECK}
                  name="removeFailedDownloads"
                  helpText={translate('RemoveFailedDownloadsHelpText')}
                  {...removeFailedDownloads}
                  onChange={handleInputChange}
                />
              </FormGroup>
            )}
          </FieldSet>
        </Form>
      </ModalBody>

      <ModalFooter>
        {id ? (
          <Button
            className={styles.deleteButton}
            kind={kinds.DANGER}
            onPress={onDeleteDownloadClientPress}
          >
            {translate('Delete')}
          </Button>
        ) : null}

        <AdvancedSettingsButton showLabel={false} />

        <SpinnerErrorButton
          isSpinning={isTesting}
          error={saveError}
          onPress={testProvider}
        >
          {translate('Test')}
        </SpinnerErrorButton>

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

export default EditDownloadClientModalContent;
