import React, { useCallback, useState } from 'react';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageHeading from 'Components/Page/PageHeading';
import PageToolbarButton from 'Components/Page/Toolbar/PageToolbarButton';
import PageToolbarSeparator from 'Components/Page/Toolbar/PageToolbarSeparator';
import SectionHeading from 'Components/SectionHeading';
import { icons } from 'Helpers/Props';
import settingsStyles from 'Settings/Settings.css';
import SettingsToolbar from 'Settings/SettingsToolbar';
import translate from 'Utilities/String/translate';
import ImportListExclusions from './ImportListExclusions/ImportListExclusions';
import ImportLists from './ImportLists/ImportLists';
import ManageImportListsModal from './ImportLists/Manage/ManageImportListsModal';
import { useTestAllImportLists } from './ImportLists/useImportLists';

// Readarr has no page-level import list options, so there is nothing to save
// from the toolbar.
function ImportListSettings() {
  const { testAllImportLists, isTestingAllImportLists, testAllResults } =
    useTestAllImportLists();

  const [isManageImportListsModalOpen, setIsManageImportListsModalOpen] =
    useState(false);

  const handleManageImportListsPress = useCallback(() => {
    setIsManageImportListsModalOpen(true);
  }, []);

  const handleManageImportListsModalClose = useCallback(() => {
    setIsManageImportListsModalOpen(false);
  }, []);

  return (
    <PageContent title={translate('ImportListSettings')}>
      <SettingsToolbar
        showSave={false}
        additionalButtons={
          <>
            <PageToolbarSeparator />

            <PageToolbarButton
              label={translate('TestAllLists')}
              iconName={icons.TEST}
              isSpinning={isTestingAllImportLists}
              onPress={testAllImportLists}
            />

            <PageToolbarButton
              label={translate('ManageLists')}
              iconName={icons.MANAGE}
              onPress={handleManageImportListsPress}
            />
          </>
        }
      />

      <PageContentBody>
        <PageHeading
          scope={translate('Settings')}
          title={translate('ImportLists')}
        />

        <div className={settingsStyles.pageSection}>
          <SectionHeading
            title={translate('ImportLists')}
            description={translate('ImportListsSectionDescription')}
          />

          <ImportLists testResults={testAllResults} />
        </div>

        <div className={settingsStyles.pageSection}>
          <SectionHeading
            title={translate('ImportListExclusions')}
            description={translate('ImportListExclusionsSectionDescription')}
          />

          <ImportListExclusions />
        </div>

        <ManageImportListsModal
          isOpen={isManageImportListsModalOpen}
          onModalClose={handleManageImportListsModalClose}
        />
      </PageContentBody>
    </PageContent>
  );
}

export default ImportListSettings;
