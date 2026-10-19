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
import Indexers from './Indexers/Indexers';
import ManageIndexersModal from './Indexers/Manage/ManageIndexersModal';
import IndexerOptions from './Options/IndexerOptions';
import { useManageIndexerSettings } from './Options/useIndexerSettings';
import { useTestAllIndexers } from './useIndexers';

function IndexerSettings() {
  const [advancedSettings] = useAdvancedSettings();
  const { testAllIndexers, isTestingAllIndexers, testAllResults } =
    useTestAllIndexers();

  const {
    settings,
    hasSettings,
    hasPendingChanges,
    isFetched,
    isSaving,
    error,
    updateSetting,
    saveSettings,
  } = useManageIndexerSettings();

  const [isManageIndexersModalOpen, setIsManageIndexersModalOpen] =
    useState(false);

  const handleManageIndexersPress = useCallback(() => {
    setIsManageIndexersModalOpen(true);
  }, []);

  const handleManageIndexersModalClose = useCallback(() => {
    setIsManageIndexersModalOpen(false);
  }, []);

  return (
    <PageContent title={translate('IndexerSettings')}>
      <SettingsToolbarConnector
        isSaving={isSaving}
        hasPendingChanges={hasPendingChanges}
        additionalButtons={
          <>
            <PageToolbarSeparator />

            <PageToolbarButton
              label={translate('TestAllIndexers')}
              iconName={icons.TEST}
              isSpinning={isTestingAllIndexers}
              onPress={testAllIndexers}
            />

            <PageToolbarButton
              label={translate('ManageIndexers')}
              iconName={icons.MANAGE}
              onPress={handleManageIndexersPress}
            />
          </>
        }
        onSavePress={saveSettings}
      />

      <PageContentBody>
        <PageHeading
          scope={translate('Settings')}
          title={translate('Indexers')}
        />

        <div className={settingsStyles.pageSection}>
          <SectionHeading
            title={translate('Indexers')}
            description={translate('IndexersSectionDescription')}
          />

          <Indexers testResults={testAllResults} />
        </div>

        <IndexerOptions
          advancedSettings={advancedSettings}
          isFetched={isFetched}
          error={error}
          settings={settings}
          hasSettings={hasSettings}
          onSettingChange={updateSetting}
        />

        <ManageIndexersModal
          isOpen={isManageIndexersModalOpen}
          onModalClose={handleManageIndexersModalClose}
        />
      </PageContentBody>
    </PageContent>
  );
}

export default IndexerSettings;
