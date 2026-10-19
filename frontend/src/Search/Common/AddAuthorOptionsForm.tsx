import React, { useCallback } from 'react';
import AuthorMetadataProfilePopoverContent from 'AddAuthor/AuthorMetadataProfilePopoverContent';
import AuthorMonitoringOptionsPopoverContent from 'AddAuthor/AuthorMonitoringOptionsPopoverContent';
import AuthorMonitorNewItemsOptionsPopoverContent from 'AddAuthor/AuthorMonitorNewItemsOptionsPopoverContent';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import Icon from 'Components/Icon';
import Popover from 'Components/Tooltip/Popover';
import { icons, inputTypes, tooltipPositions } from 'Helpers/Props';
import { AddNewOptions } from 'Search/addNewOptionsStore';
import { useSystemStatusData } from 'System/Status/useSystemStatus';
import { InputChanged } from 'typings/inputs';
import {
  PendingSection,
  ValidationError,
  ValidationWarning,
} from 'typings/pending';
import translate from 'Utilities/String/translate';
import styles from './AddAuthorOptionsForm.css';

export type AddNewOptionChanged = <K extends keyof AddNewOptions>(
  name: K,
  value: AddNewOptions[K]
) => void;

interface AddAuthorOptionsFormProps {
  settings: PendingSection<AddNewOptions>;
  validationErrors: ValidationError[];
  validationWarnings: ValidationWarning[];
  folder?: string;
  showMetadataProfile: boolean;
  includeNoneMetadataProfile: boolean;
  includeSpecificBookMonitor?: boolean;
  onOptionChange: AddNewOptionChanged;
}

// The author options shared by the add author and add book modals. Every select is
// rendered even when hidden: the root folder, quality and metadata profile selects
// pick their first value on mount, which is how a fresh form gets its defaults.
function AddAuthorOptionsForm({
  settings,
  validationErrors,
  validationWarnings,
  folder,
  showMetadataProfile,
  includeNoneMetadataProfile,
  includeSpecificBookMonitor = false,
  onOptionChange,
}: AddAuthorOptionsFormProps) {
  const { isWindows } = useSystemStatusData();

  const { rootFolderPath, monitor, monitorNewItems, qualityProfileId, tags } =
    settings;

  const handleInputChange = useCallback(
    ({ name, value }: InputChanged) => {
      onOptionChange(
        name as keyof AddNewOptions,
        value as AddNewOptions[keyof AddNewOptions]
      );
    },
    [onOptionChange]
  );

  const handleProfileIdChange = useCallback(
    ({ name, value }: InputChanged<string | number>) => {
      onOptionChange(
        name as 'qualityProfileId' | 'metadataProfileId',
        parseInt(String(value))
      );
    },
    [onOptionChange]
  );

  return (
    <Form
      validationErrors={validationErrors}
      validationWarnings={validationWarnings}
    >
      <FormGroup>
        <FormLabel>{translate('RootFolder')}</FormLabel>

        <FormInputGroup
          type={inputTypes.ROOT_FOLDER_SELECT}
          name="rootFolderPath"
          {...{
            valueOptions: {
              authorFolder: folder,
              isWindows,
            },
          }}
          selectedValueOptions={{
            authorFolder: folder,
            isWindows,
          }}
          helpText={translate('AddNewAuthorRootFolderHelpText', {
            folder: folder ?? '',
          })}
          {...rootFolderPath}
          onChange={handleInputChange}
        />
      </FormGroup>

      <FormGroup>
        <FormLabel>
          {translate('Monitor')}

          <Popover
            anchor={<Icon className={styles.labelIcon} name={icons.INFO} />}
            title={translate('MonitoringOptions')}
            body={<AuthorMonitoringOptionsPopoverContent />}
            position={tooltipPositions.RIGHT}
          />
        </FormLabel>

        <FormInputGroup
          type={inputTypes.MONITOR_BOOKS_SELECT}
          name="monitor"
          helpText={translate('MonitoringOptionsHelpText')}
          {...{ includeSpecificBook: includeSpecificBookMonitor }}
          {...monitor}
          onChange={handleInputChange}
        />
      </FormGroup>

      <FormGroup>
        <FormLabel>
          {translate('MonitorNewItems')}

          <Popover
            anchor={<Icon className={styles.labelIcon} name={icons.INFO} />}
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
          {...qualityProfileId}
          onChange={handleProfileIdChange}
        />
      </FormGroup>

      <FormGroup
        className={showMetadataProfile ? undefined : styles.hideMetadataProfile}
      >
        <FormLabel>
          {translate('MetadataProfile')}

          {includeNoneMetadataProfile ? (
            <Popover
              anchor={<Icon className={styles.labelIcon} name={icons.INFO} />}
              title={translate('MetadataProfile')}
              body={<AuthorMetadataProfilePopoverContent />}
              position={tooltipPositions.RIGHT}
            />
          ) : null}
        </FormLabel>

        <FormInputGroup
          type={inputTypes.METADATA_PROFILE_SELECT}
          name="metadataProfileId"
          {...{ includeNone: includeNoneMetadataProfile }}
          {...settings.metadataProfileId}
          onChange={handleProfileIdChange}
        />
      </FormGroup>

      <FormGroup>
        <FormLabel>{translate('Tags')}</FormLabel>

        <FormInputGroup
          type={inputTypes.TAG}
          name="tags"
          {...tags}
          onChange={handleInputChange}
        />
      </FormGroup>
    </Form>
  );
}

export default AddAuthorOptionsForm;
