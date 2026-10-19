import React, { useCallback, useState } from 'react';
import Label from 'Components/Label';
import ConfirmModal from 'Components/Modal/ConfirmModal';
import SettingsCard from 'Components/SettingsCard/SettingsCard';
import settingsCardStyles from 'Components/SettingsCard/SettingsCard.css';
import SettingsCardStatus from 'Components/SettingsCard/SettingsCardStatus';
import TagList from 'Components/TagList';
import { kinds } from 'Helpers/Props';
import {
  getProviderTestStatusLabel,
  ProviderTestStatus,
} from 'Settings/ProviderTestAllResult';
import { useTagList } from 'Tags/useTags';
import formatShortTimeSpan from 'Utilities/Date/formatShortTimeSpan';
import translate from 'Utilities/String/translate';
import EditImportListModal from './EditImportListModal';
import { ImportListModel, useDeleteImportList } from './useImportLists';

interface ImportListProps extends ImportListModel {
  testStatus?: ProviderTestStatus;
}

function ImportList({
  id,
  name,
  enableAutomaticAdd,
  shouldSearch,
  minRefreshInterval,
  tags,
  testStatus,
}: ImportListProps) {
  const tagList = useTagList();
  const { deleteImportList, isDeleting } = useDeleteImportList(id);

  const [isEditImportListModalOpen, setIsEditImportListModalOpen] =
    useState(false);
  const [isDeleteImportListModalOpen, setIsDeleteImportListModalOpen] =
    useState(false);

  const handleEditImportListPress = useCallback(() => {
    setIsEditImportListModalOpen(true);
  }, []);

  const handleEditImportListModalClose = useCallback(() => {
    setIsEditImportListModalOpen(false);
  }, []);

  const handleDeleteImportListPress = useCallback(() => {
    setIsEditImportListModalOpen(false);
    setIsDeleteImportListModalOpen(true);
  }, []);

  const handleDeleteImportListModalClose = useCallback(() => {
    setIsDeleteImportListModalOpen(false);
  }, []);

  const handleConfirmDeleteImportList = useCallback(() => {
    // The card unmounts once the list leaves the list of lists.
    deleteImportList();
  }, [deleteImportList]);

  const testStatusLabel = testStatus
    ? getProviderTestStatusLabel(testStatus)
    : undefined;

  return (
    <SettingsCard
      name={name}
      aria-label={translate('EditImportListName', { name })}
      onPress={handleEditImportListPress}
    >
      <SettingsCardStatus
        dot={enableAutomaticAdd ? 'active' : 'muted'}
        segments={[
          enableAutomaticAdd ? translate('AutomaticAdd') : null,
          `${translate('Refresh')}: ${formatShortTimeSpan(minRefreshInterval)}`,
          testStatusLabel,
        ]}
      />

      {shouldSearch ? (
        <div className={settingsCardStyles.labels}>
          <Label kind={kinds.DEFAULT}>{translate('AutomaticSearch')}</Label>
        </div>
      ) : null}

      {tags.length > 0 ? <TagList tags={tags} tagList={tagList} /> : null}

      <EditImportListModal
        id={id}
        isOpen={isEditImportListModalOpen}
        onModalClose={handleEditImportListModalClose}
        onDeleteImportListPress={handleDeleteImportListPress}
      />

      <ConfirmModal
        isOpen={isDeleteImportListModalOpen}
        kind={kinds.DANGER}
        title={translate('DeleteImportList')}
        message={translate('DeleteImportListMessageText', { name })}
        confirmLabel={translate('Delete')}
        isSpinning={isDeleting}
        onConfirm={handleConfirmDeleteImportList}
        onCancel={handleDeleteImportListModalClose}
      />
    </SettingsCard>
  );
}

export default ImportList;
