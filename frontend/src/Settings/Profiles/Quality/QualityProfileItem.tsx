import classNames from 'classnames';
import React, { useCallback } from 'react';
import { ConnectDragSource } from 'react-dnd';
import CheckInput from 'Components/Form/CheckInput';
import Icon from 'Components/Icon';
import IconButton from 'Components/Link/IconButton';
import { icons } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import styles from './QualityProfileItem.module.css';

interface QualityProfileItemProps {
  // The drag preview has no handle to connect.
  dragRef?: ConnectDragSource;
  mode: string;
  isPreview?: boolean;
  groupId?: number;
  qualityId: number;
  name: string;
  allowed: boolean;
  isDragging: boolean;
  onCreateGroupPress?: (qualityId: number) => void;
  onItemAllowedChange?: (qualityId: number, allowed: boolean) => void;
}

function QualityProfileItem({
  dragRef,
  mode,
  isPreview = false,
  groupId,
  qualityId,
  name,
  allowed,
  isDragging,
  onCreateGroupPress,
  onItemAllowedChange,
}: QualityProfileItemProps) {
  const handleAllowedChange = useCallback(
    ({ value }: { value: boolean }) => {
      onItemAllowedChange?.(qualityId, value);
    },
    [qualityId, onItemAllowedChange]
  );

  const handleCreateGroupPress = useCallback(() => {
    onCreateGroupPress?.(qualityId);
  }, [qualityId, onCreateGroupPress]);

  return (
    <div
      className={classNames(
        styles.qualityProfileItem,
        isDragging && styles.isDragging,
        isPreview && styles.isPreview,
        groupId && styles.isInGroup
      )}
    >
      <label className={styles.qualityNameContainer}>
        {mode === 'editGroups' && !groupId && !isPreview ? (
          <IconButton
            className={styles.createGroupButton}
            name={icons.GROUP}
            title={translate('Group')}
            aria-label={translate('Group')}
            onPress={handleCreateGroupPress}
          />
        ) : null}

        {mode === 'default' ? (
          <CheckInput
            className={styles.checkInput}
            containerClassName={styles.checkInputContainer}
            name={name}
            value={allowed}
            isDisabled={!!groupId}
            onChange={handleAllowedChange}
          />
        ) : null}

        <div
          className={classNames(
            styles.qualityName,
            groupId && styles.isInGroup,
            !allowed && styles.notAllowed
          )}
        >
          {name}
        </div>
      </label>

      <div ref={dragRef} className={styles.dragHandle}>
        <Icon
          className={styles.dragIcon}
          title={translate('CreateGroup')}
          name={icons.REORDER}
        />
      </div>
    </div>
  );
}

export default QualityProfileItem;
