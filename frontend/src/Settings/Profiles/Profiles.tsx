import React from 'react';
import { DndProvider } from 'react-dnd-multi-backend';
import HTML5toTouch from 'react-dnd-multi-backend/dist/esm/HTML5toTouch';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageHeading from 'Components/Page/PageHeading';
import SectionHeading from 'Components/SectionHeading';
import settingsStyles from 'Settings/Settings.css';
import SettingsToolbar from 'Settings/SettingsToolbar';
import translate from 'Utilities/String/translate';
import DelayProfiles from './Delay/DelayProfiles';
import MetadataProfiles from './Metadata/MetadataProfiles';
import QualityProfiles from './Quality/QualityProfiles';
import ReleaseProfiles from './Release/ReleaseProfiles';

// Only a single DragDrop Context can exist so it's done here to allow editing
// quality profiles and reordering delay profiles to work.

function Profiles() {
  return (
    <PageContent title={translate('Profiles')}>
      <SettingsToolbar showSave={false} />

      <PageContentBody>
        <DndProvider options={HTML5toTouch}>
          <PageHeading
            scope={translate('Settings')}
            title={translate('Profiles')}
          />

          <div className={settingsStyles.pageSection}>
            <SectionHeading
              title={translate('QualityProfiles')}
              description={translate('QualityProfilesSectionDescription')}
            />

            <QualityProfiles />
          </div>

          <div className={settingsStyles.pageSection}>
            <SectionHeading
              title={translate('MetadataProfiles')}
              description={translate('MetadataProfilesSectionDescription')}
            />

            <MetadataProfiles />
          </div>

          <div className={settingsStyles.pageSection}>
            <SectionHeading
              title={translate('DelayProfiles')}
              description={translate('DelayProfilesSectionDescription')}
            />

            <DelayProfiles />
          </div>

          <div className={settingsStyles.pageSection}>
            <SectionHeading
              title={translate('ReleaseProfiles')}
              description={translate('ReleaseProfilesSectionDescription')}
            />

            <ReleaseProfiles />
          </div>
        </DndProvider>
      </PageContentBody>
    </PageContent>
  );
}

export default Profiles;
