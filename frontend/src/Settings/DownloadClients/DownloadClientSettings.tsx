import React, { useCallback, useState } from 'react';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageHeading from 'Components/Page/PageHeading';
import PageToolbarButton from 'Components/Page/Toolbar/PageToolbarButton';
import PageToolbarSeparator from 'Components/Page/Toolbar/PageToolbarSeparator';
import SectionHeading from 'Components/SectionHeading';
import { icons } from 'Helpers/Props';
import settingsStyles from 'Settings/Settings.css';
import SettingsToolbarConnector from 'Settings/SettingsToolbarConnector';
import useAdvancedSettings from 'Settings/useAdvancedSettings';
import translate from 'Utilities/String/translate';
import DownloadClients from './DownloadClients/DownloadClients';
import ManageDownloadClientsModal from './DownloadClients/Manage/ManageDownloadClientsModal';
import { useTestAllDownloadClients } from './DownloadClients/useDownloadClients';
import DownloadClientOptions from './Options/DownloadClientOptions';
import { useManageDownloadClientSettings } from './Options/useDownloadClientSettings';
import RemotePathMappings from './RemotePathMappings/RemotePathMappings';

function DownloadClientSettings() {
  const [advancedSettings] = useAdvancedSettings();
  const {
    testAllDownloadClients,
    isTestingAllDownloadClients,
    testAllResults,
  } = useTestAllDownloadClients();

  const {
    settings,
    hasSettings,
    hasPendingChanges,
    isFetched,
    isSaving,
    error,
    updateSetting,
    saveSettings,
  } = useManageDownloadClientSettings();

  const [
    isManageDownloadClientsModalOpen,
    setIsManageDownloadClientsModalOpen,
  ] = useState(false);

  const handleManageDownloadClientsPress = useCallback(() => {
    setIsManageDownloadClientsModalOpen(true);
  }, []);

  const handleManageDownloadClientsModalClose = useCallback(() => {
    setIsManageDownloadClientsModalOpen(false);
  }, []);

  return (
    <PageContent title={translate('DownloadClientSettings')}>
      <SettingsToolbarConnector
        isSaving={isSaving}
        hasPendingChanges={hasPendingChanges}
        additionalButtons={
          <>
            <PageToolbarSeparator />

            <PageToolbarButton
              label={translate('TestAllClients')}
              iconName={icons.TEST}
              isSpinning={isTestingAllDownloadClients}
              onPress={testAllDownloadClients}
            />

            <PageToolbarButton
              label={translate('ManageClients')}
              iconName={icons.MANAGE}
              onPress={handleManageDownloadClientsPress}
            />
          </>
        }
        onSavePress={saveSettings}
      />

      <PageContentBody>
        <PageHeading
          scope={translate('Settings')}
          title={translate('DownloadClients')}
        />

        <div className={settingsStyles.pageSection}>
          <SectionHeading
            title={translate('DownloadClients')}
            description={translate('DownloadClientsSectionDescription')}
          />

          <DownloadClients testResults={testAllResults} />
        </div>

        <DownloadClientOptions
          advancedSettings={advancedSettings}
          isFetched={isFetched}
          error={error}
          settings={settings}
          hasSettings={hasSettings}
          onSettingChange={updateSetting}
        />

        <RemotePathMappings />

        <ManageDownloadClientsModal
          isOpen={isManageDownloadClientsModalOpen}
          onModalClose={handleManageDownloadClientsModalClose}
        />
      </PageContentBody>
    </PageContent>
  );
}

export default DownloadClientSettings;
