import React, { useCallback, useEffect } from 'react';
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
import { IndexerModel, useManageIndexer } from '../useIndexers';
import styles from './EditIndexerModalContent.css';

export interface EditIndexerModalContentProps {
  id?: number;
  cloneId?: number;
  selectedSchema?: SelectedSchema;
  onModalClose: () => void;
  onDeleteIndexerPress?: () => void;
}

interface InputChange {
  name: string;
  value: unknown;
}

interface FieldChange extends InputChange {
  additionalProperties?: Record<string, unknown>;
}

function EditIndexerModalContent({
  id,
  cloneId,
  selectedSchema,
  onModalClose,
  onDeleteIndexerPress,
}: EditIndexerModalContentProps) {
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
  } = useManageIndexer(id, cloneId, selectedSchema);

  const wasSaving = usePrevious(isSaving);

  const {
    implementationName = '',
    name,
    enableRss,
    enableAutomaticSearch,
    enableInteractiveSearch,
    supportsRss,
    supportsSearch,
    tags,
    fields,
    priority,
    protocol,
    downloadClientId,
  } = item;

  const handleInputChange = useCallback(
    ({ name, value }: InputChange) => {
      updateValue(
        name as keyof IndexerModel,
        value as IndexerModel[keyof IndexerModel]
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
        <ModalHeader>{translate('AddIndexer')}</ModalHeader>
        <ModalBody>{null}</ModalBody>
      </ModalContent>
    );
  }

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>
        {id
          ? translate('EditIndexerImplementation', { implementationName })
          : translate('AddIndexerImplementation', { implementationName })}
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

          <FieldSet size={sizes.SMALL} legend={translate('Search')}>
            <FormGroup>
              <FormLabel>{translate('EnableRSS')}</FormLabel>

              <FormInputGroup
                type={inputTypes.CHECK}
                name="enableRss"
                helpText={
                  supportsRss.value ? translate('EnableRssHelpText') : undefined
                }
                helpTextWarning={
                  supportsRss.value
                    ? undefined
                    : translate(
                        'SupportsRssvalueRSSIsNotSupportedWithThisIndexer'
                      )
                }
                isDisabled={!supportsRss.value}
                {...enableRss}
                onChange={handleInputChange}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>{translate('EnableAutomaticSearch')}</FormLabel>

              <FormInputGroup
                type={inputTypes.CHECK}
                name="enableAutomaticSearch"
                helpText={
                  supportsSearch.value
                    ? translate(
                        'SupportsSearchvalueWillBeUsedWhenAutomaticSearchesArePerformedViaTheUIOrByReadarr'
                      )
                    : undefined
                }
                helpTextWarning={
                  supportsSearch.value
                    ? undefined
                    : translate(
                        'SupportsSearchvalueSearchIsNotSupportedWithThisIndexer'
                      )
                }
                isDisabled={!supportsSearch.value}
                {...enableAutomaticSearch}
                onChange={handleInputChange}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>{translate('EnableInteractiveSearch')}</FormLabel>

              <FormInputGroup
                type={inputTypes.CHECK}
                name="enableInteractiveSearch"
                helpText={
                  supportsSearch.value
                    ? translate(
                        'SupportsSearchvalueWillBeUsedWhenInteractiveSearchIsUsed'
                      )
                    : undefined
                }
                helpTextWarning={
                  supportsSearch.value
                    ? undefined
                    : translate(
                        'SupportsSearchvalueSearchIsNotSupportedWithThisIndexer'
                      )
                }
                isDisabled={!supportsSearch.value}
                {...enableInteractiveSearch}
                onChange={handleInputChange}
              />
            </FormGroup>
          </FieldSet>

          {fields.map((field) => {
            return (
              <ProviderFieldFormGroup
                key={field.name}
                advancedSettings={advancedSettings}
                provider="indexer"
                providerData={item}
                {...field}
                onChange={handleFieldChange}
              />
            );
          })}

          <FormGroup advancedSettings={advancedSettings} isAdvanced={true}>
            <FormLabel>{translate('IndexerPriority')}</FormLabel>

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

          <FormGroup advancedSettings={advancedSettings} isAdvanced={true}>
            <FormLabel>{translate('DownloadClient')}</FormLabel>

            <FormInputGroup
              type={inputTypes.DOWNLOAD_CLIENT_SELECT}
              name="downloadClientId"
              helpText={translate('IndexerDownloadClientHelpText')}
              {...downloadClientId}
              {...{ includeAny: true, protocol: protocol.value }}
              onChange={handleInputChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{translate('Tags')}</FormLabel>

            <FormInputGroup
              type={inputTypes.TAG}
              name="tags"
              helpText={translate('IndexerTagsHelpText')}
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
            onPress={onDeleteIndexerPress}
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

export default EditIndexerModalContent;
