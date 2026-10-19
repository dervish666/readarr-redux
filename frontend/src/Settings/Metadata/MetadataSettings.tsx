import React from 'react';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageHeading from 'Components/Page/PageHeading';
import SettingsToolbarConnector from 'Settings/SettingsToolbarConnector';
import translate from 'Utilities/String/translate';
import MetadataProvider from './MetadataProvider/MetadataProvider';
import { useManageMetadataProviderSettings } from './MetadataProvider/useMetadataProviderSettings';

// Readarr ships no metadata file consumers, so the page holds only the tag
// writing options (the consumer list was never shown).
function MetadataSettings() {
  const {
    settings,
    hasSettings,
    hasPendingChanges,
    isFetched,
    isSaving,
    error,
    updateSetting,
    saveSettings,
  } = useManageMetadataProviderSettings();

  return (
    <PageContent title={translate('MetadataSettings')}>
      <SettingsToolbarConnector
        isSaving={isSaving}
        hasPendingChanges={hasPendingChanges}
        onSavePress={saveSettings}
      />

      <PageContentBody>
        <PageHeading
          scope={translate('Settings')}
          title={translate('Metadata')}
        />

        <MetadataProvider
          isFetched={isFetched}
          error={error}
          settings={settings}
          hasSettings={hasSettings}
          onSettingChange={updateSetting}
        />
      </PageContentBody>
    </PageContent>
  );
}

export default MetadataSettings;
