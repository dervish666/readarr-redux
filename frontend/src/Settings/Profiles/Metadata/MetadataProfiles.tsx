import React, { useCallback, useMemo, useState } from 'react';
import PageSectionContent from 'Components/Page/PageSectionContent';
import AddCard from 'Components/SettingsCard/AddCard';
import settingsCardStyles from 'Components/SettingsCard/SettingsCard.css';
import { metadataProfileNames } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import EditMetadataProfileModal from './EditMetadataProfileModal';
import MetadataProfile from './MetadataProfile';
import { useMetadataProfiles } from './useMetadataProfiles';

function MetadataProfiles() {
  const { data, isFetched, error } = useMetadataProfiles();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cloneProfileId, setCloneProfileId] = useState<number | undefined>();

  // The built-in "None" profile is not editable, so it gets no card.
  const items = useMemo(
    () =>
      data
        .filter((item) => item.name !== metadataProfileNames.NONE)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data]
  );

  const handleAddPress = useCallback(() => {
    setCloneProfileId(undefined);
    setIsModalOpen(true);
  }, []);

  const handleClonePress = useCallback((id: number) => {
    setCloneProfileId(id);
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setCloneProfileId(undefined);
    setIsModalOpen(false);
  }, []);

  return (
    <PageSectionContent
      errorMessage={translate('UnableToLoadMetadataProfiles')}
      error={error}
      isFetching={!isFetched}
      isPopulated={isFetched}
    >
      <div className={settingsCardStyles.grid}>
        {items.map((item) => (
          <MetadataProfile
            key={item.id}
            {...item}
            onCloneMetadataProfilePress={handleClonePress}
          />
        ))}

        <AddCard
          label={translate('AddMetadataProfile')}
          onPress={handleAddPress}
        />
      </div>

      <EditMetadataProfileModal
        isOpen={isModalOpen}
        cloneId={cloneProfileId}
        onModalClose={handleModalClose}
      />
    </PageSectionContent>
  );
}

export default MetadataProfiles;
