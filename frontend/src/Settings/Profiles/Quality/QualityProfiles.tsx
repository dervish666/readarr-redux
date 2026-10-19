import React, { useCallback, useMemo, useState } from 'react';
import PageSectionContent from 'Components/Page/PageSectionContent';
import AddCard from 'Components/SettingsCard/AddCard';
import settingsCardStyles from 'Components/SettingsCard/SettingsCard.css';
import translate from 'Utilities/String/translate';
import EditQualityProfileModal from './EditQualityProfileModal';
import QualityProfile from './QualityProfile';
import { useQualityProfiles } from './useQualityProfiles';

function QualityProfiles() {
  const { data, error, isFetched } = useQualityProfiles();

  const sortedItems = useMemo(
    () => [...data].sort((a, b) => a.name.localeCompare(b.name)),
    [data]
  );

  const [isQualityProfileModalOpen, setIsQualityProfileModalOpen] =
    useState(false);
  const [cloneProfileId, setCloneProfileId] = useState<number | null>(null);

  const handleAddQualityProfilePress = useCallback(() => {
    setCloneProfileId(null);
    setIsQualityProfileModalOpen(true);
  }, []);

  const handleQualityProfileModalClose = useCallback(() => {
    setCloneProfileId(null);
    setIsQualityProfileModalOpen(false);
  }, []);

  const handleCloneQualityProfilePress = useCallback((id: number) => {
    setCloneProfileId(id);
    setIsQualityProfileModalOpen(true);
  }, []);

  return (
    <PageSectionContent
      errorMessage={translate('UnableToLoadQualityProfiles')}
      error={error}
      // Spinner only for the first load: a background refetch must not unmount the cards.
      isFetching={!isFetched}
      isPopulated={isFetched}
    >
      <div className={settingsCardStyles.grid}>
        {sortedItems.map((item) => {
          return (
            <QualityProfile
              key={item.id}
              id={item.id}
              name={item.name}
              upgradeAllowed={item.upgradeAllowed}
              cutoff={item.cutoff}
              items={item.items}
              onCloneQualityProfilePress={handleCloneQualityProfilePress}
            />
          );
        })}

        <AddCard
          label={translate('AddQualityProfile')}
          onPress={handleAddQualityProfilePress}
        />
      </div>

      <EditQualityProfileModal
        isOpen={isQualityProfileModalOpen}
        cloneId={cloneProfileId ?? undefined}
        onModalClose={handleQualityProfileModalClose}
      />
    </PageSectionContent>
  );
}

export default QualityProfiles;
