import React from 'react';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageHeading from 'Components/Page/PageHeading';
import SectionHeading from 'Components/SectionHeading';
import settingsStyles from 'Settings/Settings.css';
import SettingsToolbar from 'Settings/SettingsToolbar';
import translate from 'Utilities/String/translate';
import CustomFormats from './CustomFormats/CustomFormats';

function CustomFormatSettingsPage() {
  return (
    <PageContent title={translate('CustomFormatSettings')}>
      <SettingsToolbar showSave={false} />

      <PageContentBody>
        <PageHeading
          scope={translate('Settings')}
          title={translate('CustomFormats')}
        />

        <div className={settingsStyles.pageSection}>
          <SectionHeading
            title={translate('CustomFormats')}
            description={translate('CustomFormatsSectionDescription')}
          />

          <CustomFormats />
        </div>
      </PageContentBody>
    </PageContent>
  );
}

export default CustomFormatSettingsPage;
