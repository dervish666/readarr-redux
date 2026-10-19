import classNames from 'classnames';
import React, { MouseEvent, useCallback, useMemo, useState } from 'react';
import Label from 'Components/Label';
import ConfirmModal from 'Components/Modal/ConfirmModal';
import SettingsCard from 'Components/SettingsCard/SettingsCard';
import SettingsCardAction from 'Components/SettingsCard/SettingsCardAction';
import SettingsCardStatus, {
  SettingsCardStatusValue,
} from 'Components/SettingsCard/SettingsCardStatus';
import Tooltip from 'Components/Tooltip/Tooltip';
import { icons, kinds, tooltipPositions } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import EditQualityProfileModal from './EditQualityProfileModal';
import {
  getQualityProfileItemId,
  isQualityItem,
  QualityProfileItems,
  useDeleteQualityProfile,
} from './useQualityProfiles';
import styles from './QualityProfile.module.css';

const CHIP_CAP_THRESHOLD = 6;

interface QualityProfileProps {
  id: number;
  name: string;
  upgradeAllowed: boolean;
  cutoff: number;
  items: QualityProfileItems;
  onCloneQualityProfilePress: (id: number) => void;
}

function QualityProfile({
  id,
  name,
  upgradeAllowed,
  cutoff,
  items,
  onCloneQualityProfilePress,
}: QualityProfileProps) {
  const { deleteQualityProfile, isDeleting } = useDeleteQualityProfile(id);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const allowedItems = useMemo(
    () => items.filter((item) => item.allowed),
    [items]
  );

  const cutoffName = useMemo(() => {
    const cutoffItem = allowedItems.find(
      (item) => getQualityProfileItemId(item) === cutoff
    );

    if (!cutoffItem) {
      return '';
    }

    return isQualityItem(cutoffItem)
      ? cutoffItem.quality.name
      : cutoffItem.name;
  }, [allowedItems, cutoff]);

  const isCapped = !isExpanded && allowedItems.length > CHIP_CAP_THRESHOLD;
  const visibleItems = isCapped
    ? allowedItems.slice(0, CHIP_CAP_THRESHOLD)
    : allowedItems;
  const hiddenCount = allowedItems.length - visibleItems.length;

  const handleEditPress = useCallback(() => {
    setIsEditModalOpen(true);
  }, []);

  const handleEditModalClose = useCallback(() => {
    setIsEditModalOpen(false);
  }, []);

  const handleDeletePress = useCallback(() => {
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(true);
  }, []);

  const handleDeleteModalClose = useCallback(() => {
    setIsDeleteModalOpen(false);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    // The card unmounts once the profile leaves the list.
    deleteQualityProfile();
  }, [deleteQualityProfile]);

  const handleClonePress = useCallback(() => {
    onCloneQualityProfilePress(id);
  }, [id, onCloneQualityProfilePress]);

  const handleShowAllPress = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(true);
  }, []);

  return (
    <SettingsCard
      name={name}
      aria-label={translate('EditQualityProfileName', { name })}
      actions={
        <SettingsCardAction
          title={translate('CloneProfile')}
          aria-label={translate('CloneProfile')}
          name={icons.CLONE}
          onPress={handleClonePress}
        />
      }
      onPress={handleEditPress}
    >
      <SettingsCardStatus
        dot={upgradeAllowed ? 'active' : undefined}
        segments={[
          translate(upgradeAllowed ? 'UpgradesOn' : 'UpgradesOff'),
          upgradeAllowed && cutoffName ? (
            <>
              {translate('Cutoff')}{' '}
              <SettingsCardStatusValue>{cutoffName}</SettingsCardStatusValue>
            </>
          ) : null,
        ]}
      />

      <div className={styles.chips}>
        {visibleItems.map((item) => {
          const isCutoff =
            upgradeAllowed && getQualityProfileItemId(item) === cutoff;
          const title = isCutoff
            ? translate('IsCutoffUpgradeUntilThisQualityIsMetOrExceeded')
            : undefined;

          if (isQualityItem(item)) {
            return (
              <Label
                key={item.quality.id}
                className={isCutoff ? styles.cutoffChip : undefined}
                outline={!isCutoff}
                title={title}
              >
                {item.quality.name}
              </Label>
            );
          }

          return (
            <Tooltip
              key={`group-${item.id}`}
              anchor={
                <Label
                  className={classNames(
                    styles.groupChip,
                    isCutoff && styles.cutoffChip
                  )}
                  outline={!isCutoff}
                  title={title}
                >
                  <span className={styles.groupName}>{item.name}</span>

                  <span className={styles.groupCount}>
                    +{item.items.length}
                  </span>
                </Label>
              }
              tooltip={
                <div>
                  {item.items.map((groupItem) => (
                    <Label key={groupItem.quality.id} kind={kinds.DEFAULT}>
                      {groupItem.quality.name}
                    </Label>
                  ))}
                </div>
              }
              kind={kinds.INVERSE}
              position={tooltipPositions.TOP}
            />
          );
        })}

        {hiddenCount > 0 ? (
          <button
            className={styles.moreChip}
            type="button"
            onClick={handleShowAllPress}
          >
            {translate('ShowMoreCount', { count: hiddenCount })}
          </button>
        ) : null}
      </div>

      <EditQualityProfileModal
        id={id}
        isOpen={isEditModalOpen}
        onModalClose={handleEditModalClose}
        onDeleteQualityProfilePress={handleDeletePress}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        kind={kinds.DANGER}
        title={translate('DeleteQualityProfile')}
        message={translate('DeleteQualityProfileMessageText', { name })}
        confirmLabel={translate('Delete')}
        isSpinning={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={handleDeleteModalClose}
      />
    </SettingsCard>
  );
}

export default QualityProfile;
