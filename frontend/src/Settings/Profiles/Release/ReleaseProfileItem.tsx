import React, { useCallback } from 'react';
import MiddleTruncate from 'react-middle-truncate';
import Label from 'Components/Label';
import ConfirmModal from 'Components/Modal/ConfirmModal';
import SettingsCard from 'Components/SettingsCard/SettingsCard';
import settingsCardStyles from 'Components/SettingsCard/SettingsCard.module.css';
import SettingsCardAction from 'Components/SettingsCard/SettingsCardAction';
import SettingsCardStatus, {
  SettingsCardStatusValue,
} from 'Components/SettingsCard/SettingsCardStatus';
import TagList from 'Components/TagList';
import useModalOpenState from 'Helpers/Hooks/useModalOpenState';
import { icons, kinds } from 'Helpers/Props';
import { IndexerModel } from 'Settings/Indexers/useIndexers';
import { Tag } from 'Tags/useTags';
import translate from 'Utilities/String/translate';
import EditReleaseProfileModal from './EditReleaseProfileModal';
import {
  ReleaseProfileModel,
  useDeleteReleaseProfile,
} from './useReleaseProfiles';
import styles from './ReleaseProfileItem.module.css';

interface ReleaseProfileItemProps extends ReleaseProfileModel {
  tagList: ReadonlyArray<Tag>;
  indexerList: readonly IndexerModel[];
}

function ReleaseProfileItem({
  id,
  enabled = true,
  required = [],
  ignored = [],
  indexerId = 0,
  tags,
  tagList,
  indexerList,
}: ReleaseProfileItemProps) {
  const { deleteReleaseProfile, isDeleting } = useDeleteReleaseProfile(id);

  const [isEditModalOpen, setEditModalOpen, setEditModalClosed] =
    useModalOpenState(false);

  const [isDeleteModalOpen, setDeleteModalOpen, setDeleteModalClosed] =
    useModalOpenState(false);

  const indexer = indexerId
    ? indexerList.find((i) => i.id === indexerId)
    : undefined;

  const handleDeletePress = useCallback(() => {
    setEditModalClosed();
    setDeleteModalOpen();
  }, [setEditModalClosed, setDeleteModalOpen]);

  const handleConfirmDelete = useCallback(() => {
    // The card unmounts once the profile leaves the list.
    deleteReleaseProfile();
  }, [deleteReleaseProfile]);

  return (
    <SettingsCard
      // Release profiles have no name in Readarr's API.
      name={translate('ReleaseProfile')}
      isUnnamed={true}
      aria-label={translate('EditReleaseProfile')}
      actions={
        <SettingsCardAction
          title={translate('DeleteReleaseProfile')}
          aria-label={translate('DeleteReleaseProfile')}
          name={icons.DELETE}
          onPress={setDeleteModalOpen}
        />
      }
      onPress={setEditModalOpen}
    >
      <SettingsCardStatus
        dot={enabled ? 'active' : 'muted'}
        segments={[
          translate(enabled ? 'Enabled' : 'Disabled'),
          indexer ? (
            <SettingsCardStatusValue>{indexer.name}</SettingsCardStatusValue>
          ) : null,
        ]}
      />

      {required.length || ignored.length ? (
        <div className={styles.chips}>
          {required.map((item) => {
            if (!item) {
              return null;
            }

            return (
              <Label
                key={item}
                className={settingsCardStyles.truncatedLabel}
                kind={kinds.SUCCESS}
              >
                <MiddleTruncate text={item} start={10} end={10} />
              </Label>
            );
          })}

          {ignored.map((item) => {
            if (!item) {
              return null;
            }

            return (
              <Label
                key={item}
                className={settingsCardStyles.truncatedLabel}
                kind={kinds.DANGER}
              >
                <MiddleTruncate text={item} start={10} end={10} />
              </Label>
            );
          })}
        </div>
      ) : null}

      {tags.length ? <TagList tags={tags} tagList={tagList} /> : null}

      <EditReleaseProfileModal
        id={id}
        isOpen={isEditModalOpen}
        onModalClose={setEditModalClosed}
        onDeleteReleaseProfilePress={handleDeletePress}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        kind={kinds.DANGER}
        title={translate('DeleteReleaseProfile')}
        message={translate('DeleteReleaseProfileMessageText')}
        confirmLabel={translate('Delete')}
        isSpinning={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={setDeleteModalClosed}
      />
    </SettingsCard>
  );
}

export default ReleaseProfileItem;
