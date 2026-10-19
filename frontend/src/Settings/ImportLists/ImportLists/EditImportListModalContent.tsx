import React, { useCallback, useEffect } from 'react';
import AuthorMonitorNewItemsOptionsPopoverContent from 'AddAuthor/AuthorMonitorNewItemsOptionsPopoverContent';
import Alert from 'Components/Alert';
import DescriptionList from 'Components/DescriptionList/DescriptionList';
import DescriptionListItem from 'Components/DescriptionList/DescriptionListItem';
import FieldSet from 'Components/FieldSet';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import ProviderFieldFormGroup from 'Components/Form/ProviderFieldFormGroup';
import Icon from 'Components/Icon';
import Button from 'Components/Link/Button';
import SpinnerErrorButton from 'Components/Link/SpinnerErrorButton';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import Popover from 'Components/Tooltip/Popover';
import usePrevious from 'Helpers/Hooks/usePrevious';
import { icons, inputTypes, kinds, tooltipPositions } from 'Helpers/Props';
import AdvancedSettingsButton from 'Settings/AdvancedSettingsButton';
import { useShowAdvancedSettings } from 'Settings/advancedSettingsStore';
import { useMetadataProfiles } from 'Settings/Profiles/Metadata/useMetadataProfiles';
import { SelectedSchema } from 'Settings/useProviderSchema';
import formatShortTimeSpan from 'Utilities/Date/formatShortTimeSpan';
import translate from 'Utilities/String/translate';
import { ImportListModel, useManageImportList } from './useImportLists';
import styles from './EditImportListModalContent.css';

const monitorOptions = [
  {
    key: 'none',
    get value() {
      return translate('None');
    },
  },
  {
    key: 'specificBook',
    get value() {
      return translate('SpecificBook');
    },
  },
  {
    key: 'entireAuthor',
    get value() {
      return translate('AllAuthorBooks');
    },
  },
];

function ImportListMonitoringOptionsPopoverContent() {
  return (
    <DescriptionList>
      <DescriptionListItem
        title={translate('None')}
        data={translate('DataListMonitorNone')}
      />

      <DescriptionListItem
        title={translate('SpecificBook')}
        data={translate('DataListMonitorSpecificBook')}
      />

      <DescriptionListItem
        title={translate('AllAuthorBooks')}
        data={translate('DataListMonitorAll')}
      />
    </DescriptionList>
  );
}

export interface EditImportListModalContentProps {
  id?: number;
  selectedSchema?: SelectedSchema;
  onModalClose: () => void;
  onDeleteImportListPress?: () => void;
}

interface InputChange {
  name: string;
  value: unknown;
}

interface FieldChange extends InputChange {
  additionalProperties?: Record<string, unknown>;
}

function EditImportListModalContent({
  id,
  selectedSchema,
  onModalClose,
  onDeleteImportListPress,
}: EditImportListModalContentProps) {
  const advancedSettings = useShowAdvancedSettings();

  // The metadata profile only matters once there is more than one to pick from.
  const { data: metadataProfiles } = useMetadataProfiles();
  const showMetadataProfile = metadataProfiles.length > 1;

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
  } = useManageImportList(id, selectedSchema);

  const wasSaving = usePrevious(isSaving);

  const {
    implementationName = '',
    name,
    enableAutomaticAdd,
    minRefreshInterval,
    shouldMonitor,
    shouldMonitorExisting,
    shouldSearch,
    rootFolderPath,
    monitorNewItems,
    qualityProfileId,
    metadataProfileId,
    tags,
    fields,
    message,
  } = item;

  const handleInputChange = useCallback(
    ({ name, value }: InputChange) => {
      updateValue(
        name as keyof ImportListModel,
        value as ImportListModel[keyof ImportListModel]
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
        <ModalHeader>{translate('AddImportList')}</ModalHeader>
        <ModalBody>{null}</ModalBody>
      </ModalContent>
    );
  }

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>
        {id
          ? translate('EditImportListImplementation', { implementationName })
          : translate('AddImportListImplementation', { implementationName })}
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

          <Alert kind={kinds.INFO} className={styles.message}>
            {translate('ListWillRefreshEveryInterp', {
              0: formatShortTimeSpan(minRefreshInterval.value),
            })}
          </Alert>

          <FieldSet legend={translate('ImportListSettings')}>
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
              <FormLabel>{translate('EnableAutomaticAdd')}</FormLabel>

              <FormInputGroup
                type={inputTypes.CHECK}
                name="enableAutomaticAdd"
                helpText={translate('EnableAutomaticAddHelpText')}
                {...enableAutomaticAdd}
                onChange={handleInputChange}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>
                {translate('Monitor')}

                <Popover
                  anchor={
                    <Icon className={styles.labelIcon} name={icons.INFO} />
                  }
                  title={translate('MonitoringOptions')}
                  body={<ImportListMonitoringOptionsPopoverContent />}
                  position={tooltipPositions.RIGHT}
                />
              </FormLabel>

              <FormInputGroup
                type={inputTypes.SELECT}
                name="shouldMonitor"
                values={monitorOptions}
                helpText={translate('ShouldMonitorHelpText')}
                {...shouldMonitor}
                onChange={handleInputChange}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>{translate('ShouldMonitorExisting')}</FormLabel>

              <FormInputGroup
                type={inputTypes.CHECK}
                name="shouldMonitorExisting"
                helpText={translate('ShouldMonitorExistingHelpText')}
                {...shouldMonitorExisting}
                onChange={handleInputChange}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>{translate('SearchForNewItems')}</FormLabel>

              <FormInputGroup
                type={inputTypes.CHECK}
                name="shouldSearch"
                helpText={translate('ShouldSearchHelpText')}
                {...shouldSearch}
                onChange={handleInputChange}
              />
            </FormGroup>
          </FieldSet>

          <FieldSet legend={translate('AddedAuthorSettings')}>
            <FormGroup>
              <FormLabel>{translate('RootFolder')}</FormLabel>

              <FormInputGroup
                type={inputTypes.ROOT_FOLDER_SELECT}
                name="rootFolderPath"
                helpText={translate('RootFolderPathHelpText')}
                {...rootFolderPath}
                {...{ includeMissingValue: true }}
                onChange={handleInputChange}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>
                {translate('MonitorNewItems')}

                <Popover
                  anchor={
                    <Icon className={styles.labelIcon} name={icons.INFO} />
                  }
                  title={translate('MonitorNewItems')}
                  body={<AuthorMonitorNewItemsOptionsPopoverContent />}
                  position={tooltipPositions.RIGHT}
                />
              </FormLabel>

              <FormInputGroup
                type={inputTypes.MONITOR_NEW_ITEMS_SELECT}
                name="monitorNewItems"
                helpText={translate('MonitorNewItemsHelpText')}
                {...monitorNewItems}
                onChange={handleInputChange}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>{translate('QualityProfile')}</FormLabel>

              <FormInputGroup
                type={inputTypes.QUALITY_PROFILE_SELECT}
                name="qualityProfileId"
                helpText={translate('QualityProfileIdHelpText')}
                {...qualityProfileId}
                onChange={handleInputChange}
              />
            </FormGroup>

            <FormGroup
              className={
                showMetadataProfile ? undefined : styles.hideMetadataProfile
              }
            >
              <FormLabel>{translate('MetadataProfile')}</FormLabel>

              <FormInputGroup
                type={inputTypes.METADATA_PROFILE_SELECT}
                name="metadataProfileId"
                helpText={translate('MetadataProfileIdHelpText')}
                {...metadataProfileId}
                {...{ includeNone: true }}
                onChange={handleInputChange}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>{translate('ReadarrTags')}</FormLabel>

              <FormInputGroup
                type={inputTypes.TAG}
                name="tags"
                helpText={translate('TagsHelpText')}
                {...tags}
                onChange={handleInputChange}
              />
            </FormGroup>
          </FieldSet>

          {fields.length ? (
            <FieldSet legend={translate('ImportListSpecificSettings')}>
              {fields.map((field) => (
                <ProviderFieldFormGroup
                  key={field.name}
                  advancedSettings={advancedSettings}
                  provider="importList"
                  providerData={item}
                  {...field}
                  onChange={handleFieldChange}
                />
              ))}
            </FieldSet>
          ) : null}
        </Form>
      </ModalBody>

      <ModalFooter>
        {id ? (
          <Button
            className={styles.deleteButton}
            kind={kinds.DANGER}
            onPress={onDeleteImportListPress}
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

export default EditImportListModalContent;
