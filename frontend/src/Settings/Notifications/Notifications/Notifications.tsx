import React, { useCallback, useState } from 'react';
import PageSectionContent from 'Components/Page/PageSectionContent';
import AddCard from 'Components/SettingsCard/AddCard';
import settingsCardStyles from 'Components/SettingsCard/SettingsCard.css';
import { SelectedSchema } from 'Settings/useProviderSchema';
import translate from 'Utilities/String/translate';
import { useSortedConnections } from '../useConnections';
import AddNotificationModal from './AddNotificationModal';
import EditNotificationModal from './EditNotificationModal';
import Notification from './Notification';

function Notifications() {
  const { isFetched, data, error } = useSortedConnections();

  const [isAddNotificationModalOpen, setIsAddNotificationModalOpen] =
    useState(false);
  const [isEditNotificationModalOpen, setIsEditNotificationModalOpen] =
    useState(false);
  const [selectedSchema, setSelectedSchema] = useState<
    SelectedSchema | undefined
  >();

  const handleAddNotificationPress = useCallback(() => {
    setIsAddNotificationModalOpen(true);
  }, []);

  const handleNotificationSelect = useCallback((selected: SelectedSchema) => {
    setSelectedSchema(selected);
    setIsAddNotificationModalOpen(false);
    setIsEditNotificationModalOpen(true);
  }, []);

  const handleAddNotificationModalClose = useCallback(() => {
    setIsAddNotificationModalOpen(false);
  }, []);

  const handleEditNotificationModalClose = useCallback(() => {
    setSelectedSchema(undefined);
    setIsEditNotificationModalOpen(false);
  }, []);

  return (
    <PageSectionContent
      errorMessage={translate('UnableToLoadNotifications')}
      error={error}
      isFetching={!isFetched}
      isPopulated={isFetched}
    >
      <div className={settingsCardStyles.grid}>
        {data.map((item) => (
          <Notification key={item.id} {...item} />
        ))}

        <AddCard
          label={translate('AddConnection')}
          onPress={handleAddNotificationPress}
        />
      </div>

      <AddNotificationModal
        isOpen={isAddNotificationModalOpen}
        onNotificationSelect={handleNotificationSelect}
        onModalClose={handleAddNotificationModalClose}
      />

      <EditNotificationModal
        isOpen={isEditNotificationModalOpen}
        selectedSchema={selectedSchema}
        onModalClose={handleEditNotificationModalClose}
      />
    </PageSectionContent>
  );
}

export default Notifications;
