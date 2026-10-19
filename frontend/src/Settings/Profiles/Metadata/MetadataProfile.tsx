import React, { useCallback } from 'react';
import MiddleTruncate from 'react-middle-truncate';
import Label from 'Components/Label';
import ConfirmModal from 'Components/Modal/ConfirmModal';
import SettingsCard from 'Components/SettingsCard/SettingsCard';
import settingsCardStyles from 'Components/SettingsCard/SettingsCard.css';
import SettingsCardAction from 'Components/SettingsCard/SettingsCardAction';
import SettingsCardStatus, {
  SettingsCardStatusValue,
} from 'Components/SettingsCard/SettingsCardStatus';
import useModalOpenState from 'Helpers/Hooks/useModalOpenState';
import { icons, kinds } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import EditMetadataProfileModal from './EditMetadataProfileModal';
import {
  MetadataProfileModel,
  useDeleteMetadataProfile,
} from './useMetadataProfiles';
import styles from './MetadataProfile.css';

interface MetadataProfileProps extends MetadataProfileModel {
  onCloneMetadataProfilePress: (id: number) => void;
}

function MetadataProfile({
  id,
  name,
  minPopularity = 0,
  minPages = 0,
  ignored = [],
  onCloneMetadataProfilePress,
}: MetadataProfileProps) {
  const { deleteMetadataProfile, isDeleting } = useDeleteMetadataProfile(id);

  const [isEditModalOpen, setEditModalOpen, setEditModalClosed] =
    useModalOpenState(false);

  const [isDeleteModalOpen, setDeleteModalOpen, setDeleteModalClosed] =
    useModalOpenState(false);

  const handleDeletePress = useCallback(() => {
    setEditModalClosed();
    setDeleteModalOpen();
  }, [setEditModalClosed, setDeleteModalOpen]);

  const handleConfirmDelete = useCallback(() => {
    // The card unmounts once the profile leaves the list.
    deleteMetadataProfile();
  }, [deleteMetadataProfile]);

  const handleClonePress = useCallback(() => {
    onCloneMetadataProfilePress(id);
  }, [id, onCloneMetadataProfilePress]);

  const ignoredTerms = ignored.filter(Boolean);

  return (
    <SettingsCard
      name={name}
      aria-label={translate('EditMetadataProfileName', { name })}
      actions={
        <SettingsCardAction
          title={translate('CloneProfile')}
          aria-label={translate('CloneProfile')}
          name={icons.CLONE}
          onPress={handleClonePress}
        />
      }
      onPress={setEditModalOpen}
    >
      <SettingsCardStatus
        segments={[
          minPopularity ? (
            <>
              {translate('MinimumPopularity')}{' '}
              <SettingsCardStatusValue>{minPopularity}</SettingsCardStatusValue>
            </>
          ) : null,
          minPages ? (
            <>
              {translate('MinimumPages')}{' '}
              <SettingsCardStatusValue>{minPages}</SettingsCardStatusValue>
            </>
          ) : null,
        ]}
      />

      {ignoredTerms.length ? (
        <div className={styles.chips}>
          {ignoredTerms.map((item) => (
            <Label
              key={item}
              className={settingsCardStyles.truncatedLabel}
              kind={kinds.DANGER}
            >
              <MiddleTruncate text={item} start={10} end={10} />
            </Label>
          ))}
        </div>
      ) : null}

      <EditMetadataProfileModal
        id={id}
        isOpen={isEditModalOpen}
        onModalClose={setEditModalClosed}
        onDeleteMetadataProfilePress={handleDeletePress}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        kind={kinds.DANGER}
        title={translate('DeleteMetadataProfile')}
        message={translate('DeleteMetadataProfileMessageText', { name })}
        confirmLabel={translate('Delete')}
        isSpinning={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={setDeleteModalClosed}
      />
    </SettingsCard>
  );
}

export default MetadataProfile;
