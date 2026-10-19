import React from 'react';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageHeading from 'Components/Page/PageHeading';
import SectionHeading from 'Components/SectionHeading';
import SettingsToolbarConnector from 'Settings/SettingsToolbarConnector';
import translate from 'Utilities/String/translate';
import Tags from './Tags';

function TagSettings() {
  return (
    <PageContent title={translate('Tags')}>
      <SettingsToolbarConnector showSave={false} />

      <PageContentBody>
        <PageHeading scope={translate('Settings')} title={translate('Tags')} />

        <SectionHeading
          title={translate('Tags')}
          description={translate('TagsSectionDescription')}
        />

        <Tags />
      </PageContentBody>
    </PageContent>
  );
}

export default TagSettings;
