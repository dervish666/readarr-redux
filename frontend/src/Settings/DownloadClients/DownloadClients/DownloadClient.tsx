import React, { useCallback, useState } from 'react';
import ProtocolLabel from 'Activity/Queue/ProtocolLabel';
import ConfirmModal from 'Components/Modal/ConfirmModal';
import SettingsCard from 'Components/SettingsCard/SettingsCard';
import settingsCardStyles from 'Components/SettingsCard/SettingsCard.module.css';
import SettingsCardStatus from 'Components/SettingsCard/SettingsCardStatus';
import TagList from 'Components/TagList';
import { kinds } from 'Helpers/Props';
import {
  getProviderTestStatusLabel,
  ProviderTestStatus,
} from 'Settings/ProviderTestAllResult';
import { useTagList } from 'Tags/useTags';
import translate from 'Utilities/String/translate';
import EditDownloadClientModal from './EditDownloadClientModal';
import {
  DownloadClientModel,
  useDeleteDownloadClient,
} from './useDownloadClients';

interface DownloadClientProps extends DownloadClientModel {
  testStatus?: ProviderTestStatus;
}

function DownloadClient({
  id,
  name,
  protocol,
  enable,
  priority,
  tags,
  testStatus,
}: DownloadClientProps) {
  const tagList = useTagList();
  const { deleteDownloadClient, isDeleting } = useDeleteDownloadClient(id);

  const [isEditDownloadClientModalOpen, setIsEditDownloadClientModalOpen] =
    useState(false);
  const [isDeleteDownloadClientModalOpen, setIsDeleteDownloadClientModalOpen] =
    useState(false);

  const handleEditDownloadClientPress = useCallback(() => {
    setIsEditDownloadClientModalOpen(true);
  }, []);

  const handleEditDownloadClientModalClose = useCallback(() => {
    setIsEditDownloadClientModalOpen(false);
  }, []);

  const handleDeleteDownloadClientPress = useCallback(() => {
    setIsEditDownloadClientModalOpen(false);
    setIsDeleteDownloadClientModalOpen(true);
  }, []);

  const handleDeleteDownloadClientModalClose = useCallback(() => {
    setIsDeleteDownloadClientModalOpen(false);
  }, []);

  const handleConfirmDeleteDownloadClient = useCallback(() => {
    // The card unmounts once the client leaves the list.
    deleteDownloadClient();
  }, [deleteDownloadClient]);

  const testStatusLabel = testStatus
    ? getProviderTestStatusLabel(testStatus)
    : undefined;

  return (
    <SettingsCard
      name={name}
      aria-label={translate('EditDownloadClientName', { name })}
      onPress={handleEditDownloadClientPress}
    >
      <SettingsCardStatus
        dot={enable ? 'active' : 'muted'}
        segments={[
          translate(enable ? 'Enabled' : 'Disabled'),
          priority > 1 ? `${translate('Priority')} ${priority}` : null,
          testStatusLabel,
        ]}
      />

      <div className={settingsCardStyles.labels}>
        <ProtocolLabel protocol={protocol} />
      </div>

      {tags.length > 0 ? <TagList tags={tags} tagList={tagList} /> : null}

      <EditDownloadClientModal
        id={id}
        isOpen={isEditDownloadClientModalOpen}
        onModalClose={handleEditDownloadClientModalClose}
        onDeleteDownloadClientPress={handleDeleteDownloadClientPress}
      />

      <ConfirmModal
        isOpen={isDeleteDownloadClientModalOpen}
        kind={kinds.DANGER}
        title={translate('DeleteDownloadClient')}
        message={translate('DeleteDownloadClientMessageText', { name })}
        confirmLabel={translate('Delete')}
        isSpinning={isDeleting}
        onConfirm={handleConfirmDeleteDownloadClient}
        onCancel={handleDeleteDownloadClientModalClose}
      />
    </SettingsCard>
  );
}

export default DownloadClient;
