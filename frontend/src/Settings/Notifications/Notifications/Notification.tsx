import React, { useCallback, useState } from 'react';
import Label from 'Components/Label';
import ConfirmModal from 'Components/Modal/ConfirmModal';
import SettingsCard from 'Components/SettingsCard/SettingsCard';
import settingsCardStyles from 'Components/SettingsCard/SettingsCard.css';
import SettingsCardStatus from 'Components/SettingsCard/SettingsCardStatus';
import TagList from 'Components/TagList';
import { kinds } from 'Helpers/Props';
import { useTagList } from 'Tags/useTags';
import translate from 'Utilities/String/translate';
import { NotificationModel, useDeleteConnection } from '../useConnections';
import EditNotificationModal from './EditNotificationModal';

function Notification({
  id,
  name,
  onGrab,
  onReleaseImport,
  onUpgrade,
  onRename,
  onAuthorAdded,
  onAuthorDelete,
  onBookDelete,
  onBookFileDelete,
  onBookFileDeleteForUpgrade,
  onHealthIssue,
  onDownloadFailure,
  onImportFailure,
  onBookRetag,
  onApplicationUpdate,
  supportsOnGrab,
  supportsOnReleaseImport,
  supportsOnUpgrade,
  supportsOnRename,
  supportsOnAuthorAdded,
  supportsOnAuthorDelete,
  supportsOnBookDelete,
  supportsOnBookFileDelete,
  supportsOnBookFileDeleteForUpgrade,
  supportsOnHealthIssue,
  supportsOnDownloadFailure,
  supportsOnImportFailure,
  supportsOnBookRetag,
  supportsOnApplicationUpdate,
  tags,
}: NotificationModel) {
  const tagList = useTagList();
  const { deleteConnection, isDeleting } = useDeleteConnection(id);

  const [isEditNotificationModalOpen, setIsEditNotificationModalOpen] =
    useState(false);
  const [isDeleteNotificationModalOpen, setIsDeleteNotificationModalOpen] =
    useState(false);

  const handleEditNotificationPress = useCallback(() => {
    setIsEditNotificationModalOpen(true);
  }, []);

  const handleEditNotificationModalClose = useCallback(() => {
    setIsEditNotificationModalOpen(false);
  }, []);

  const handleDeleteNotificationPress = useCallback(() => {
    setIsEditNotificationModalOpen(false);
    setIsDeleteNotificationModalOpen(true);
  }, []);

  const handleDeleteNotificationModalClose = useCallback(() => {
    setIsDeleteNotificationModalOpen(false);
  }, []);

  const handleConfirmDeleteNotification = useCallback(() => {
    // The card unmounts once the connection leaves the list.
    deleteConnection();
  }, [deleteConnection]);

  // Each trigger the provider supports and the connection has switched on, in
  // the order the edit modal lists them.
  const triggers = [
    supportsOnGrab && onGrab && 'OnGrab',
    supportsOnReleaseImport && onReleaseImport && 'OnReleaseImport',
    supportsOnUpgrade && onReleaseImport && onUpgrade && 'OnUpgrade',
    supportsOnRename && onRename && 'OnRename',
    supportsOnBookRetag && onBookRetag && 'OnBookTagUpdate',
    supportsOnAuthorAdded && onAuthorAdded && 'OnAuthorAdded',
    supportsOnAuthorDelete && onAuthorDelete && 'OnAuthorDelete',
    supportsOnBookDelete && onBookDelete && 'OnBookDelete',
    supportsOnBookFileDelete && onBookFileDelete && 'OnBookFileDelete',
    supportsOnBookFileDeleteForUpgrade &&
      onBookFileDelete &&
      onBookFileDeleteForUpgrade &&
      'OnBookFileDeleteForUpgrade',
    supportsOnHealthIssue && onHealthIssue && 'OnHealthIssue',
    supportsOnDownloadFailure && onDownloadFailure && 'OnDownloadFailure',
    supportsOnImportFailure && onImportFailure && 'OnImportFailure',
    supportsOnApplicationUpdate && onApplicationUpdate && 'OnApplicationUpdate',
  ].filter((key): key is string => !!key);

  const enabled = triggers.length > 0;

  return (
    <SettingsCard
      name={name}
      aria-label={translate('EditConnectionName', { name })}
      onPress={handleEditNotificationPress}
    >
      <SettingsCardStatus
        dot={enabled ? 'active' : 'muted'}
        segments={[translate(enabled ? 'Enabled' : 'Disabled')]}
      />

      {enabled ? (
        <div className={settingsCardStyles.labels}>
          {triggers.map((key) => (
            <Label key={key} kind={kinds.DEFAULT}>
              {translate(key)}
            </Label>
          ))}
        </div>
      ) : null}

      {tags.length > 0 ? <TagList tags={tags} tagList={tagList} /> : null}

      <EditNotificationModal
        id={id}
        isOpen={isEditNotificationModalOpen}
        onModalClose={handleEditNotificationModalClose}
        onDeleteNotificationPress={handleDeleteNotificationPress}
      />

      <ConfirmModal
        isOpen={isDeleteNotificationModalOpen}
        kind={kinds.DANGER}
        title={translate('DeleteNotification')}
        message={translate('DeleteNotificationMessageText', { name })}
        confirmLabel={translate('Delete')}
        isSpinning={isDeleting}
        onConfirm={handleConfirmDeleteNotification}
        onCancel={handleDeleteNotificationModalClose}
      />
    </SettingsCard>
  );
}

export default Notification;
