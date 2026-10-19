import classNames from 'classnames';
import React, { useCallback } from 'react';
import { ConnectDragSource } from 'react-dnd';
import CheckInput from 'Components/Form/CheckInput';
import TextInput from 'Components/Form/TextInput';
import Icon from 'Components/Icon';
import Label from 'Components/Label';
import IconButton from 'Components/Link/IconButton';
import { icons } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import QualityProfileItemDragSource, {
  EditQualityProfileMode,
  QualityProfileItemDragSourceActionProps,
} from './QualityProfileItemDragSource';
import { QualityProfileQualityItem } from './useQualityProfiles';
import styles from './QualityProfileItemGroup.css';

interface QualityProfileItemGroupProps
  extends QualityProfileItemDragSourceActionProps {
  dragRef: ConnectDragSource;
  mode: EditQualityProfileMode;
  groupId: number;
  name: string;
  allowed: boolean;
  items: QualityProfileQualityItem[];
  qualityIndex: string;
  isDragging: boolean;
  isDraggingUp: boolean;
  isDraggingDown: boolean;
}

function QualityProfileItemGroup({
  dragRef,
  mode,
  groupId,
  name,
  allowed,
  items,
  qualityIndex,
  isDragging,
  isDraggingUp,
  isDraggingDown,
  ...actions
}: QualityProfileItemGroupProps) {
  const { onGroupAllowedChange, onItemGroupNameChange, onDeleteGroupPress } =
    actions;

  const handleAllowedChange = useCallback(
    ({ value }: { value: boolean }) => {
      onGroupAllowedChange(groupId, value);
    },
    [groupId, onGroupAllowedChange]
  );

  const handleNameChange = useCallback(
    ({ value }: { value: string }) => {
      onItemGroupNameChange(groupId, value);
    },
    [groupId, onItemGroupNameChange]
  );

  const handleDeleteGroupPress = useCallback(() => {
    onDeleteGroupPress(groupId);
  }, [groupId, onDeleteGroupPress]);

  return (
    <div
      className={classNames(
        styles.qualityProfileItemGroup,
        isDragging && styles.isDragging
      )}
    >
      <div className={styles.qualityProfileItemGroupInfo}>
        {mode === 'editGroups' ? (
          <div className={styles.qualityNameContainer}>
            <IconButton
              className={styles.deleteGroupButton}
              name={icons.UNGROUP}
              title={translate('Ungroup')}
              aria-label={translate('Ungroup')}
              onPress={handleDeleteGroupPress}
            />

            <TextInput
              className={styles.nameInput}
              name="name"
              value={name}
              onChange={handleNameChange}
            />
          </div>
        ) : (
          <label className={styles.qualityNameLabel}>
            <CheckInput
              className={styles.checkInput}
              containerClassName={styles.checkInputContainer}
              name="allowed"
              value={allowed}
              onChange={handleAllowedChange}
            />

            <div className={styles.nameContainer}>
              <div
                className={classNames(
                  styles.name,
                  !allowed && styles.notAllowed
                )}
              >
                {name}
              </div>

              <div className={styles.groupQualities}>
                {items
                  .map(({ quality }) => {
                    return (
                      <Label key={quality.id} outline={true}>
                        {quality.name}
                      </Label>
                    );
                  })
                  .reverse()}
              </div>
            </div>
          </label>
        )}

        <div ref={dragRef} className={styles.dragHandle}>
          <Icon
            className={styles.dragIcon}
            name={icons.REORDER}
            title={translate('Reorder')}
          />
        </div>
      </div>

      {mode === 'editGroups' ? (
        <div className={styles.items}>
          {items
            .map(({ quality }, index) => {
              return (
                <QualityProfileItemDragSource
                  key={quality.id}
                  {...actions}
                  mode={mode}
                  groupId={groupId}
                  qualityId={quality.id}
                  name={quality.name}
                  allowed={allowed}
                  qualityIndex={`${qualityIndex}.${index + 1}`}
                  isInGroup={true}
                  isDraggingUp={isDraggingUp}
                  isDraggingDown={isDraggingDown}
                />
              );
            })
            .reverse()}
        </div>
      ) : null}
    </div>
  );
}

export default QualityProfileItemGroup;
