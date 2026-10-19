import React, { useCallback, useMemo, useState } from 'react';
import FieldSet from 'Components/FieldSet';
import PageSectionContent from 'Components/Page/PageSectionContent';
import AddCard from 'Components/SettingsCard/AddCard';
import settingsCardStyles from 'Components/SettingsCard/SettingsCard.css';
import useRootFolders from 'RootFolder/useRootFolders';
import { useMetadataProfiles } from 'Settings/Profiles/Metadata/useMetadataProfiles';
import { useQualityProfiles } from 'Settings/Profiles/Quality/useQualityProfiles';
import translate from 'Utilities/String/translate';
import EditRootFolderModal from './EditRootFolderModal';
import RootFolder from './RootFolder';

function RootFolders() {
  const { data, isFetched, error } = useRootFolders();
  const [isAddRootFolderModalOpen, setIsAddRootFolderModalOpen] =
    useState(false);

  const { data: qualityProfiles } = useQualityProfiles();
  const { data: metadataProfiles } = useMetadataProfiles();

  const items = useMemo(
    () => [...data].sort((a, b) => a.name.localeCompare(b.name)),
    [data]
  );

  const handleAddRootFolderPress = useCallback(() => {
    setIsAddRootFolderModalOpen(true);
  }, []);

  const handleAddRootFolderModalClose = useCallback(() => {
    setIsAddRootFolderModalOpen(false);
  }, []);

  return (
    <FieldSet legend={translate('RootFolders')}>
      <PageSectionContent
        errorMessage={translate('UnableToLoadRootFolders')}
        error={error}
        // Spinner only for the first load, so a refetch keeps the cards (and any
        // open edit modal) mounted.
        isFetching={!isFetched}
        isPopulated={isFetched}
      >
        <div className={settingsCardStyles.grid}>
          {items.map((item) => {
            return (
              <RootFolder
                key={item.id}
                rootFolder={item}
                qualityProfile={qualityProfiles.find(
                  (profile) => profile.id === item.defaultQualityProfileId
                )}
                metadataProfile={metadataProfiles.find(
                  (profile) => profile.id === item.defaultMetadataProfileId
                )}
              />
            );
          })}

          <AddCard
            label={translate('AddRootFolder')}
            onPress={handleAddRootFolderPress}
          />
        </div>

        <EditRootFolderModal
          isOpen={isAddRootFolderModalOpen}
          onModalClose={handleAddRootFolderModalClose}
        />
      </PageSectionContent>
    </FieldSet>
  );
}

export default RootFolders;
