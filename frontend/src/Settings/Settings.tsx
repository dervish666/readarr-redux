import { LucideIcon } from 'lucide-react';
import React from 'react';
import Icon from 'Components/Icon';
import Link from 'Components/Link/Link';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageHeading from 'Components/Page/PageHeading';
import { icons } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import SettingsToolbar from './SettingsToolbar';
import styles from './Settings.css';

interface SectionEntry {
  to: string;
  iconName: LucideIcon;
  title: string;
  summary: string;
}

function buildSections(): SectionEntry[] {
  return [
    {
      to: '/settings/mediamanagement',
      iconName: icons.DRIVE,
      title: translate('MediaManagement'),
      summary: translate('MediaManagementSettingsSummary'),
    },
    {
      to: '/settings/profiles',
      iconName: icons.PROFILE,
      title: translate('Profiles'),
      summary: translate('ProfilesSettingsSummary'),
    },
    {
      to: '/settings/quality',
      iconName: icons.MEDIA_INFO,
      title: translate('Quality'),
      summary: translate('QualitySettingsSummary'),
    },
    {
      to: '/settings/customformats',
      iconName: icons.MANAGE,
      title: translate('CustomFormats'),
      summary: translate('CustomFormatsSettingsSummary'),
    },
    {
      to: '/settings/indexers',
      iconName: icons.RSS,
      title: translate('Indexers'),
      summary: translate('IndexersSettingsSummary'),
    },
    {
      to: '/settings/downloadclients',
      iconName: icons.DOWNLOADING,
      title: translate('DownloadClients'),
      summary: translate('DownloadClientsSettingsSummary'),
    },
    {
      to: '/settings/importlists',
      iconName: icons.FOLDER,
      title: translate('Lists'),
      summary: translate('ListsSettingsSummary'),
    },
    {
      to: '/settings/connect',
      iconName: icons.NETWORK,
      title: translate('Connect'),
      summary: translate('ConnectSettingsSummary'),
    },
    {
      to: '/settings/metadata',
      iconName: icons.CLIPBOARD,
      title: translate('Metadata'),
      summary: translate('MetadataSettingsSummary'),
    },
    {
      to: '/settings/metadatasource',
      iconName: icons.SEARCH,
      title: translate('MetadataSource'),
      summary: translate('MetadataSourceSettingsSummary'),
    },
    {
      to: '/settings/tags',
      iconName: icons.TAGS,
      title: translate('Tags'),
      summary: translate('TagsSettingsSummary'),
    },
    {
      to: '/settings/general',
      iconName: icons.ADVANCED_SETTINGS,
      title: translate('General'),
      summary: translate('GeneralSettingsSummary'),
    },
    {
      to: '/settings/ui',
      iconName: icons.VIEW,
      title: translate('Ui'),
      summary: translate('UISettingsSummary'),
    },
  ];
}

function Settings() {
  const sections = buildSections();

  return (
    <PageContent title={translate('Settings')}>
      <SettingsToolbar showSave={false} />

      <PageContentBody>
        <PageHeading title={translate('Settings')} />

        <div className={styles.grid}>
          {sections.map((section) => (
            <Link key={section.to} className={styles.card} to={section.to}>
              <div className={styles.cardHead}>
                <span className={styles.cardIcon}>
                  <Icon name={section.iconName} size={16} />
                </span>

                <h2 className={styles.cardTitle}>{section.title}</h2>
              </div>

              <p className={styles.cardSummary}>{section.summary}</p>
            </Link>
          ))}
        </div>
      </PageContentBody>
    </PageContent>
  );
}

export default Settings;
