import React, { useCallback, useRef, useState } from 'react';
import Alert from 'Components/Alert';
import FieldSet from 'Components/FieldSet';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageHeading from 'Components/Page/PageHeading';
import { inputTypes, kinds, sizes } from 'Helpers/Props';
import { useShowAdvancedSettings } from 'Settings/advancedSettingsStore';
import RemotePathMappings from 'Settings/DownloadClients/RemotePathMappings/RemotePathMappings';
import SettingsToolbar from 'Settings/SettingsToolbar';
import { useSystemStatusData } from 'System/Status/useSystemStatus';
import { InputChanged } from 'typings/inputs';
import translate from 'Utilities/String/translate';
import Naming, { NamingStateChange } from './Naming/Naming';
import RootFolders from './RootFolder/RootFolders';
import {
  MediaManagementSettingsModel,
  useManageMediaManagementSettings,
} from './useMediaManagementSettings';

const rescanAfterRefreshOptions = [
  { key: 'always', value: 'Always' },
  { key: 'afterManual', value: 'After Manual Refresh' },
  { key: 'never', value: 'Never' },
];

const allowFingerprintingOptions = [
  { key: 'allFiles', value: 'Always' },
  { key: 'newFiles', value: 'For new imports only' },
  { key: 'never', value: 'Never' },
];

const downloadPropersAndRepacksOptions = [
  { key: 'preferAndUpgrade', value: 'Prefer and Upgrade' },
  { key: 'doNotUpgrade', value: 'Do not Upgrade Automatically' },
  { key: 'doNotPrefer', value: 'Do not Prefer' },
];

const fileDateOptions = [
  { key: 'none', value: 'None' },
  { key: 'bookReleaseDate', value: 'Book Release Date' },
];

function MediaManagement() {
  const advancedSettings = useShowAdvancedSettings();
  const { isWindows } = useSystemStatusData();

  const {
    settings,
    hasSettings,
    hasPendingChanges,
    validationErrors,
    validationWarnings,
    isFetching,
    isFetched,
    isSaving,
    error,
    updateSetting,
    saveSettings: saveMediaManagementSettings,
  } = useManageMediaManagementSettings();

  const [naming, setNaming] = useState<NamingStateChange>({
    isSaving: false,
    hasPendingChanges: false,
  });

  const saveNamingSettings = useRef<() => void>(() => {});

  const handleSetNamingSave = useCallback((saveCallback: () => void) => {
    saveNamingSettings.current = saveCallback;
  }, []);

  // One Save covers both resources; each only sends what changed.
  const handleSavePress = useCallback(() => {
    if (hasPendingChanges) {
      saveMediaManagementSettings();
    }

    if (naming.hasPendingChanges) {
      saveNamingSettings.current();
    }
  }, [
    hasPendingChanges,
    naming.hasPendingChanges,
    saveMediaManagementSettings,
  ]);

  const handleInputChange = useCallback(
    ({ name, value }: InputChanged) => {
      updateSetting(
        name as keyof MediaManagementSettingsModel,
        value as MediaManagementSettingsModel[keyof MediaManagementSettingsModel]
      );
    },
    [updateSetting]
  );

  return (
    <PageContent title={translate('MediaManagementSettings')}>
      <SettingsToolbar
        isSaving={isSaving || naming.isSaving}
        hasPendingChanges={hasPendingChanges || naming.hasPendingChanges}
        onSavePress={handleSavePress}
      />

      <PageContentBody>
        <PageHeading
          scope={translate('Settings')}
          title={translate('MediaManagement')}
        />

        <RootFolders />
        <RemotePathMappings />

        <Naming
          setChildSave={handleSetNamingSave}
          onChildStateChange={setNaming}
        />

        {isFetching && !isFetched ? (
          <FieldSet legend={translate('NamingSettings')}>
            <LoadingIndicator />
          </FieldSet>
        ) : null}

        {isFetched && error ? (
          <FieldSet legend={translate('NamingSettings')}>
            <Alert kind={kinds.DANGER}>
              {translate('UnableToLoadMediaManagementSettings')}
            </Alert>
          </FieldSet>
        ) : null}

        {hasSettings && isFetched && !error ? (
          <Form
            validationErrors={validationErrors}
            validationWarnings={validationWarnings}
          >
            {advancedSettings ? (
              <FieldSet legend={translate('Folders')}>
                <FormGroup
                  advancedSettings={advancedSettings}
                  isAdvanced={true}
                  size={sizes.MEDIUM}
                >
                  <FormLabel>{translate('CreateEmptyAuthorFolders')}</FormLabel>

                  <FormInputGroup
                    type={inputTypes.CHECK}
                    name="createEmptyAuthorFolders"
                    helpText={translate('CreateEmptyAuthorFoldersHelpText')}
                    onChange={handleInputChange}
                    {...settings.createEmptyAuthorFolders}
                  />
                </FormGroup>

                <FormGroup
                  advancedSettings={advancedSettings}
                  isAdvanced={true}
                  size={sizes.MEDIUM}
                >
                  <FormLabel>{translate('DeleteEmptyFolders')}</FormLabel>

                  <FormInputGroup
                    type={inputTypes.CHECK}
                    name="deleteEmptyFolders"
                    helpText={translate('DeleteEmptyFoldersHelpText')}
                    onChange={handleInputChange}
                    {...settings.deleteEmptyFolders}
                  />
                </FormGroup>
              </FieldSet>
            ) : null}

            {advancedSettings ? (
              <FieldSet legend={translate('Importing')}>
                {isWindows ? null : (
                  <FormGroup
                    advancedSettings={advancedSettings}
                    isAdvanced={true}
                    size={sizes.MEDIUM}
                  >
                    <FormLabel>{translate('SkipFreeSpaceCheck')}</FormLabel>

                    <FormInputGroup
                      type={inputTypes.CHECK}
                      name="skipFreeSpaceCheckWhenImporting"
                      helpText={translate(
                        'SkipFreeSpaceCheckWhenImportingHelpText'
                      )}
                      onChange={handleInputChange}
                      {...settings.skipFreeSpaceCheckWhenImporting}
                    />
                  </FormGroup>
                )}

                <FormGroup
                  advancedSettings={advancedSettings}
                  isAdvanced={true}
                  size={sizes.MEDIUM}
                >
                  <FormLabel>{translate('MinimumFreeSpace')}</FormLabel>

                  <FormInputGroup
                    type={inputTypes.NUMBER}
                    unit="MB"
                    name="minimumFreeSpaceWhenImporting"
                    helpText={translate(
                      'MinimumFreeSpaceWhenImportingHelpText'
                    )}
                    onChange={handleInputChange}
                    {...settings.minimumFreeSpaceWhenImporting}
                  />
                </FormGroup>

                <FormGroup
                  advancedSettings={advancedSettings}
                  isAdvanced={true}
                  size={sizes.MEDIUM}
                >
                  <FormLabel>{translate('MinimumBookMatch')}</FormLabel>

                  <FormInputGroup
                    type={inputTypes.NUMBER}
                    unit="%"
                    name="minimumBookMatchPercent"
                    min={50}
                    max={100}
                    helpText={translate('MinimumBookMatchHelpText')}
                    onChange={handleInputChange}
                    {...settings.minimumBookMatchPercent}
                  />
                </FormGroup>

                <FormGroup
                  advancedSettings={advancedSettings}
                  isAdvanced={true}
                  size={sizes.MEDIUM}
                >
                  <FormLabel>
                    {translate('UseHardlinksInsteadOfCopy')}
                  </FormLabel>

                  <FormInputGroup
                    type={inputTypes.CHECK}
                    name="copyUsingHardlinks"
                    helpText={translate('CopyUsingHardlinksHelpText')}
                    helpTextWarning={translate(
                      'CopyUsingHardlinksHelpTextWarning'
                    )}
                    onChange={handleInputChange}
                    {...settings.copyUsingHardlinks}
                  />
                </FormGroup>

                <FormGroup size={sizes.MEDIUM}>
                  <FormLabel>{translate('ImportExtraFiles')}</FormLabel>

                  <FormInputGroup
                    type={inputTypes.CHECK}
                    name="importExtraFiles"
                    helpText={translate('ImportExtraFilesHelpText')}
                    onChange={handleInputChange}
                    {...settings.importExtraFiles}
                  />
                </FormGroup>

                {settings.importExtraFiles.value ? (
                  <FormGroup
                    advancedSettings={advancedSettings}
                    isAdvanced={true}
                  >
                    <FormLabel>{translate('ImportExtraFiles')}</FormLabel>

                    <FormInputGroup
                      type={inputTypes.TEXT}
                      name="extraFileExtensions"
                      helpTexts={[
                        translate('ExtraFileExtensionsHelpText'),
                        translate('ExtraFileExtensionsHelpTextsExamples'),
                      ]}
                      onChange={handleInputChange}
                      {...settings.extraFileExtensions}
                    />
                  </FormGroup>
                ) : null}
              </FieldSet>
            ) : null}

            <FieldSet legend={translate('FileManagement')}>
              <FormGroup size={sizes.MEDIUM}>
                <FormLabel>{translate('IgnoreDeletedBooks')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.CHECK}
                  name="autoUnmonitorPreviouslyDownloadedBooks"
                  helpText={translate(
                    'AutoUnmonitorPreviouslyDownloadedBooksHelpText'
                  )}
                  onChange={handleInputChange}
                  {...settings.autoUnmonitorPreviouslyDownloadedBooks}
                />
              </FormGroup>

              <FormGroup
                advancedSettings={advancedSettings}
                isAdvanced={true}
                size={sizes.MEDIUM}
              >
                <FormLabel>{translate('PropersAndRepacks')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.SELECT}
                  name="downloadPropersAndRepacks"
                  helpTexts={[
                    translate('DownloadPropersAndRepacksHelpTexts1'),
                    translate('DownloadPropersAndRepacksHelpTexts2'),
                  ]}
                  helpTextWarning={
                    settings.downloadPropersAndRepacks.value === 'doNotPrefer'
                      ? 'Use custom formats for automatic upgrades to propers/repacks'
                      : undefined
                  }
                  values={downloadPropersAndRepacksOptions}
                  onChange={handleInputChange}
                  {...settings.downloadPropersAndRepacks}
                />
              </FormGroup>

              <FormGroup
                advancedSettings={advancedSettings}
                isAdvanced={true}
                size={sizes.MEDIUM}
              >
                <FormLabel>
                  {translate('WatchRootFoldersForFileChanges')}
                </FormLabel>

                <FormInputGroup
                  type={inputTypes.CHECK}
                  name="watchLibraryForChanges"
                  helpText={translate('WatchLibraryForChangesHelpText')}
                  onChange={handleInputChange}
                  {...settings.watchLibraryForChanges}
                />
              </FormGroup>

              <FormGroup advancedSettings={advancedSettings} isAdvanced={true}>
                <FormLabel>
                  {translate('RescanAuthorFolderAfterRefresh')}
                </FormLabel>

                <FormInputGroup
                  type={inputTypes.SELECT}
                  name="rescanAfterRefresh"
                  helpText={translate('RescanAfterRefreshHelpText')}
                  helpTextWarning={translate(
                    'RescanAfterRefreshHelpTextWarning'
                  )}
                  values={rescanAfterRefreshOptions}
                  onChange={handleInputChange}
                  {...settings.rescanAfterRefresh}
                />
              </FormGroup>

              <FormGroup advancedSettings={advancedSettings} isAdvanced={true}>
                <FormLabel>{translate('AllowFingerprinting')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.SELECT}
                  name="allowFingerprinting"
                  helpText={translate('AllowFingerprintingHelpText')}
                  helpTextWarning={translate(
                    'AllowFingerprintingHelpTextWarning'
                  )}
                  values={allowFingerprintingOptions}
                  onChange={handleInputChange}
                  {...settings.allowFingerprinting}
                />
              </FormGroup>

              <FormGroup advancedSettings={advancedSettings} isAdvanced={true}>
                <FormLabel>{translate('ChangeFileDate')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.SELECT}
                  name="fileDate"
                  helpText={translate('FileDateHelpText')}
                  values={fileDateOptions}
                  onChange={handleInputChange}
                  {...settings.fileDate}
                />
              </FormGroup>

              <FormGroup advancedSettings={advancedSettings} isAdvanced={true}>
                <FormLabel>{translate('RecyclingBin')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.PATH}
                  name="recycleBin"
                  helpText={translate('RecycleBinHelpText')}
                  onChange={handleInputChange}
                  {...settings.recycleBin}
                />
              </FormGroup>

              <FormGroup advancedSettings={advancedSettings} isAdvanced={true}>
                <FormLabel>{translate('RecyclingBinCleanup')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.NUMBER}
                  name="recycleBinCleanupDays"
                  helpText={translate('RecycleBinCleanupDaysHelpText')}
                  helpTextWarning={translate(
                    'RecycleBinCleanupDaysHelpTextWarning'
                  )}
                  min={0}
                  onChange={handleInputChange}
                  {...settings.recycleBinCleanupDays}
                />
              </FormGroup>
            </FieldSet>

            {advancedSettings && !isWindows ? (
              <FieldSet legend={translate('Permissions')}>
                <FormGroup
                  advancedSettings={advancedSettings}
                  isAdvanced={true}
                  size={sizes.MEDIUM}
                >
                  <FormLabel>{translate('SetPermissions')}</FormLabel>

                  <FormInputGroup
                    type={inputTypes.CHECK}
                    name="setPermissionsLinux"
                    helpText={translate('SetPermissionsLinuxHelpText')}
                    helpTextWarning={translate(
                      'SetPermissionsLinuxHelpTextWarning'
                    )}
                    onChange={handleInputChange}
                    {...settings.setPermissionsLinux}
                  />
                </FormGroup>

                <FormGroup
                  advancedSettings={advancedSettings}
                  isAdvanced={true}
                >
                  <FormLabel>{translate('ChmodFolder')}</FormLabel>

                  <FormInputGroup
                    type={inputTypes.UMASK}
                    name="chmodFolder"
                    helpText={translate('ChmodFolderHelpText')}
                    helpTextWarning={translate('ChmodFolderHelpTextWarning')}
                    onChange={handleInputChange}
                    {...settings.chmodFolder}
                  />
                </FormGroup>

                <FormGroup
                  advancedSettings={advancedSettings}
                  isAdvanced={true}
                >
                  <FormLabel>{translate('ChownGroup')}</FormLabel>

                  <FormInputGroup
                    type={inputTypes.TEXT}
                    name="chownGroup"
                    helpText={translate('ChownGroupHelpText')}
                    helpTextWarning={translate('ChownGroupHelpTextWarning')}
                    onChange={handleInputChange}
                    {...settings.chownGroup}
                  />
                </FormGroup>
              </FieldSet>
            ) : null}
          </Form>
        ) : null}
      </PageContentBody>
    </PageContent>
  );
}

export default MediaManagement;
