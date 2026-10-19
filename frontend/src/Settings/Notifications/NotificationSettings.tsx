import React from 'react';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageHeading from 'Components/Page/PageHeading';
import SectionHeading from 'Components/SectionHeading';
import settingsStyles from 'Settings/Settings.module.css';
import SettingsToolbar from 'Settings/SettingsToolbar';
import translate from 'Utilities/String/translate';
import Notifications from './Notifications/Notifications';

function NotificationSettings() {
  return (
    <PageContent title={translate('ConnectSettings')}>
      <SettingsToolbar showSave={false} />

      <PageContentBody>
        <PageHeading
          scope={translate('Settings')}
          title={translate('Connect')}
        />

        <div className={settingsStyles.pageSection}>
          <SectionHeading
            title={translate('Connections')}
            description={translate('NotificationsSectionDescription')}
          />

          <Notifications />
        </div>
      </PageContentBody>
    </PageContent>
  );
}

export default NotificationSettings;
