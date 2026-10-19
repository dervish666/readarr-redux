import React, { useCallback, useState } from 'react';
import ConfirmModal from 'Components/Modal/ConfirmModal';
import SettingsCard from 'Components/SettingsCard/SettingsCard';
import settingsCardStyles from 'Components/SettingsCard/SettingsCard.css';
import { kinds } from 'Helpers/Props';
import { useTagDetail } from 'Tags/useTagDetails';
import { useDeleteTag } from 'Tags/useTags';
import translate from 'Utilities/String/translate';
import TagDetailsModal from './Details/TagDetailsModal';
import TagInUse from './TagInUse';

interface TagProps {
  id: number;
  label: string;
}

function Tag({ id, label }: TagProps) {
  const { deleteTag } = useDeleteTag(id);
  const {
    delayProfileIds,
    importListIds,
    notificationIds,
    restrictionIds,
    indexerIds,
    downloadClientIds,
    authorIds,
  } = useTagDetail(id);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteTagModalOpen, setIsDeleteTagModalOpen] = useState(false);

  const isTagUsed = !!(
    delayProfileIds.length ||
    importListIds.length ||
    notificationIds.length ||
    restrictionIds.length ||
    indexerIds.length ||
    downloadClientIds.length ||
    authorIds.length
  );

  const handleShowDetailsPress = useCallback(() => {
    setIsDetailsModalOpen(true);
  }, []);

  const handleDetailsModalClose = useCallback(() => {
    setIsDetailsModalOpen(false);
  }, []);

  const handleDeleteTagPress = useCallback(() => {
    setIsDetailsModalOpen(false);
    setIsDeleteTagModalOpen(true);
  }, []);

  const handleConfirmDeleteTag = useCallback(() => {
    setIsDeleteTagModalOpen(false);
    deleteTag();
  }, [deleteTag]);

  const handleDeleteTagModalClose = useCallback(() => {
    setIsDeleteTagModalOpen(false);
  }, []);

  return (
    <SettingsCard
      name={label}
      aria-label={translate('TagDetails', { label })}
      onPress={handleShowDetailsPress}
    >
      {isTagUsed ? (
        <div className={settingsCardStyles.labels}>
          <TagInUse
            label={translate('Author')}
            labelPlural={translate('Authors')}
            count={authorIds.length}
          />

          <TagInUse
            label={translate('DelayProfile')}
            labelPlural={translate('DelayProfiles')}
            count={delayProfileIds.length}
          />

          <TagInUse
            label={translate('ImportList')}
            labelPlural={translate('ImportLists')}
            count={importListIds.length}
          />

          <TagInUse
            label={translate('Connection')}
            labelPlural={translate('Connections')}
            count={notificationIds.length}
          />

          <TagInUse
            label={translate('ReleaseProfile')}
            labelPlural={translate('ReleaseProfiles')}
            count={restrictionIds.length}
          />

          <TagInUse
            label={translate('Indexer')}
            labelPlural={translate('Indexers')}
            count={indexerIds.length}
          />

          <TagInUse
            label={translate('DownloadClient')}
            labelPlural={translate('DownloadClients')}
            count={downloadClientIds.length}
          />
        </div>
      ) : (
        <div className={settingsCardStyles.statusLine}>
          {translate('NoLinks')}
        </div>
      )}

      <TagDetailsModal
        label={label}
        isTagUsed={isTagUsed}
        authorIds={authorIds}
        delayProfileIds={delayProfileIds}
        importListIds={importListIds}
        notificationIds={notificationIds}
        releaseProfileIds={restrictionIds}
        indexerIds={indexerIds}
        downloadClientIds={downloadClientIds}
        isOpen={isDetailsModalOpen}
        onModalClose={handleDetailsModalClose}
        onDeleteTagPress={handleDeleteTagPress}
      />

      <ConfirmModal
        isOpen={isDeleteTagModalOpen}
        kind={kinds.DANGER}
        title={translate('DeleteTag')}
        message={translate('DeleteTagMessageText', { 0: label, label })}
        confirmLabel={translate('Delete')}
        onConfirm={handleConfirmDeleteTag}
        onCancel={handleDeleteTagModalClose}
      />
    </SettingsCard>
  );
}

export default Tag;
