import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Alert from 'Components/Alert';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import Button from 'Components/Link/Button';
import SpinnerErrorButton from 'Components/Link/SpinnerErrorButton';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import usePrevious from 'Helpers/Hooks/usePrevious';
import { inputTypes, kinds, sizes } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import QualityProfileFormatItems from './QualityProfileFormatItems';
import {
  DragMoveState,
  EditQualityProfileMode,
} from './QualityProfileItemDragSource';
import QualityProfileItems from './QualityProfileItems';
import useQualityProfileInUse from './useQualityProfileInUse';
import {
  getQualityProfileItemId,
  isQualityItem,
  QualityProfileGroup,
  QualityProfileItems as Items,
  QualityProfileModel,
  QualityProfileQualityItem,
  useManageQualityProfile,
} from './useQualityProfiles';
import styles from './EditQualityProfileModalContent.css';

const NO_DRAG: DragMoveState = {
  dragQualityIndex: null,
  dropQualityIndex: null,
  dropPosition: null,
};

// Indexes are 1-based strings: "3" for a top level item, "3.2" for the second
// quality in the group at position 3.
function parseIndex(index: string): [number | null, number] {
  const split = index.split('.');

  if (split.length === 1) {
    return [null, parseInt(split[0]) - 1];
  }

  return [parseInt(split[0]) - 1, parseInt(split[1]) - 1];
}

// Copies the items deep enough that splicing groups never touches the cache.
function copyItems(items: Items): Items {
  return items.map((item) =>
    isQualityItem(item) ? { ...item } : { ...item, items: [...item.items] }
  );
}

interface EditQualityProfileModalContentProps {
  id?: number;
  cloneId?: number;
  onDeleteQualityProfilePress?: () => void;
  onModalClose: () => void;
}

function EditQualityProfileModalContent({
  id,
  cloneId,
  onDeleteQualityProfilePress,
  onModalClose,
}: EditQualityProfileModalContentProps) {
  const {
    item,
    isSaving,
    saveError,
    isSchemaLoading,
    isSchemaFetched,
    schemaError,
    validationErrors,
    validationWarnings,
    updateValue,
    saveProvider,
  } = useManageQualityProfile(id, cloneId);

  const isInUse = useQualityProfileInUse(id);

  const [mode, setMode] = useState<EditQualityProfileMode>('default');
  const [dndState, setDndState] = useState<DragMoveState>(NO_DRAG);
  const { dragQualityIndex, dropQualityIndex, dropPosition } = dndState;

  const wasSaving = usePrevious(isSaving);

  const {
    name,
    upgradeAllowed,
    cutoff,
    minFormatScore,
    cutoffFormatScore,
    items,
    formatItems,
  } = item;

  const qualities = useMemo(() => {
    return items.value.reduceRight<{ key: number; value: string }[]>(
      (acc, qualityItem) => {
        if (qualityItem.allowed) {
          acc.push({
            key: getQualityProfileItemId(qualityItem),
            value: isQualityItem(qualityItem)
              ? qualityItem.quality.name
              : qualityItem.name,
          });
        }

        return acc;
      },
      []
    );
  }, [items]);

  const handleInputChange = useCallback(
    ({ name, value }: { name: string; value: unknown }) => {
      updateValue(
        name as keyof QualityProfileModel,
        value as QualityProfileModel[keyof QualityProfileModel]
      );
    },
    [updateValue]
  );

  const handleCutoffChange = useCallback(
    ({ value }: { value: string | number }) => {
      updateValue('cutoff', Number(value));
    },
    [updateValue]
  );

  const handleItemAllowedChange = useCallback(
    (qualityId: number, allowed: boolean) => {
      updateValue(
        'items',
        items.value.map((i) =>
          isQualityItem(i) && i.quality.id === qualityId ? { ...i, allowed } : i
        )
      );
    },
    [items, updateValue]
  );

  const handleGroupAllowedChange = useCallback(
    (groupId: number, allowed: boolean) => {
      updateValue(
        'items',
        items.value.map((i) => {
          if (isQualityItem(i) || i.id !== groupId) {
            return i;
          }

          // Update each item in the group (for consistency only)
          return {
            ...i,
            allowed,
            items: i.items.map((groupItem) => ({ ...groupItem, allowed })),
          };
        })
      );
    },
    [items, updateValue]
  );

  const handleGroupNameChange = useCallback(
    (groupId: number, groupName: string) => {
      updateValue(
        'items',
        items.value.map((i) =>
          !isQualityItem(i) && i.id === groupId ? { ...i, name: groupName } : i
        )
      );
    },
    [items, updateValue]
  );

  const handleCreateGroupPress = useCallback(
    (qualityId: number) => {
      const groupId =
        items.value.reduce(
          (acc, i) => (!isQualityItem(i) && i.id > acc ? i.id : acc),
          1000
        ) + 1;

      updateValue(
        'items',
        items.value.map((i) => {
          if (isQualityItem(i) && i.quality.id === qualityId) {
            const group: QualityProfileGroup = {
              id: groupId,
              name: i.quality.name,
              allowed: i.allowed,
              items: [i],
            };

            return group;
          }

          return i;
        })
      );
    },
    [items, updateValue]
  );

  const handleDeleteGroupPress = useCallback(
    (groupId: number) => {
      updateValue(
        'items',
        items.value.reduce<Items>((acc, i) => {
          if (!isQualityItem(i) && i.id === groupId) {
            // The items go back in the same place the group was.
            acc.push(...i.items);
          } else {
            acc.push(i);
          }

          return acc;
        }, [])
      );
    },
    [items, updateValue]
  );

  const handleDragMove = useCallback((options: DragMoveState) => {
    const { dragQualityIndex, dropQualityIndex, dropPosition } = options;

    if (!dragQualityIndex || !dropQualityIndex || !dropPosition) {
      setDndState(NO_DRAG);

      return;
    }

    const [dragGroupIndex, dragItemIndex] = parseIndex(dragQualityIndex);
    const [dropGroupIndex, dropItemIndex] = parseIndex(dropQualityIndex);

    if (
      (dropPosition === 'below' && dropItemIndex - 1 === dragItemIndex) ||
      (dropPosition === 'above' && dropItemIndex + 1 === dragItemIndex)
    ) {
      setDndState(NO_DRAG);

      return;
    }

    let adjustedDropQualityIndex = dropQualityIndex;

    // Correct dragging out of a group to the position above
    if (
      dropPosition === 'above' &&
      dragGroupIndex !== dropGroupIndex &&
      dropGroupIndex != null
    ) {
      // Add 1 to the group index and 2 to the item index so it's inserted above in the correct group
      adjustedDropQualityIndex = `${dropGroupIndex + 1}.${dropItemIndex + 2}`;
    }

    // Correct inserting above outside a group
    if (
      dropPosition === 'above' &&
      dragGroupIndex !== dropGroupIndex &&
      dropGroupIndex == null
    ) {
      // Add 2 to the item index so it's entered in the correct place
      adjustedDropQualityIndex = `${dropItemIndex + 2}`;
    }

    // Correct inserting below a quality within the same group (when moving a lower item)
    if (
      dropPosition === 'below' &&
      dragGroupIndex === dropGroupIndex &&
      dropGroupIndex != null &&
      dragItemIndex < dropItemIndex
    ) {
      // Add 1 to the group index leave the item index
      adjustedDropQualityIndex = `${dropGroupIndex + 1}.${dropItemIndex}`;
    }

    // Correct inserting below a quality outside a group (when moving a lower item)
    if (
      dropPosition === 'below' &&
      dragGroupIndex === dropGroupIndex &&
      dropGroupIndex == null &&
      dragItemIndex < dropItemIndex
    ) {
      // Leave the item index so it's inserted below the item
      adjustedDropQualityIndex = `${dropItemIndex}`;
    }

    setDndState((current) => {
      if (
        current.dragQualityIndex === dragQualityIndex &&
        current.dropQualityIndex === adjustedDropQualityIndex &&
        current.dropPosition === dropPosition
      ) {
        return current;
      }

      return {
        dragQualityIndex,
        dropQualityIndex: adjustedDropQualityIndex,
        dropPosition,
      };
    });
  }, []);

  const handleDragEnd = useCallback(
    (didDrop: boolean) => {
      if (didDrop && dragQualityIndex != null && dropQualityIndex != null) {
        const newItems = copyItems(items.value);
        const [dragGroupIndex, dragItemIndex] = parseIndex(dragQualityIndex);
        const [dropGroupIndex, dropItemIndex] = parseIndex(dropQualityIndex);

        // Get the group before moving anything so we know the correct place to drop it.
        const dropGroup =
          dropGroupIndex == null
            ? null
            : (newItems[dropGroupIndex] as QualityProfileGroup);

        const dragGroup =
          dragGroupIndex == null
            ? null
            : (newItems[dragGroupIndex] as QualityProfileGroup);

        const movedItem = dragGroup
          ? dragGroup.items.splice(dragItemIndex, 1)[0]
          : newItems.splice(dragItemIndex, 1)[0];

        // If the group is now empty, destroy it.
        if (dragGroup && dragGroupIndex != null && !dragGroup.items.length) {
          newItems.splice(dragGroupIndex, 1);
        }

        if (dropGroup == null) {
          newItems.splice(dropItemIndex, 0, movedItem);
        } else {
          dropGroup.items.splice(
            dropItemIndex,
            0,
            movedItem as QualityProfileQualityItem
          );
        }

        updateValue('items', newItems);
      }

      setDndState(NO_DRAG);
    },
    [dragQualityIndex, dropQualityIndex, items, updateValue]
  );

  const handleFormatItemScoreChange = useCallback(
    (formatId: number, score: number) => {
      updateValue(
        'formatItems',
        formatItems.value.map((formatItem) =>
          formatItem.format === formatId ? { ...formatItem, score } : formatItem
        )
      );
    },
    [formatItems, updateValue]
  );

  useEffect(() => {
    if (wasSaving && !isSaving && !saveError) {
      onModalClose();
    }
  }, [isSaving, wasSaving, saveError, onModalClose]);

  // If the cutoff isn't allowed anymore or there isn't a cutoff set one
  useEffect(() => {
    if (!isSchemaFetched || !items.value.length) {
      return;
    }

    const cutoffItem = cutoff.value
      ? items.value.find((i) => getQualityProfileItemId(i) === cutoff.value)
      : undefined;

    if (cutoffItem?.allowed) {
      return;
    }

    const firstAllowed = items.value.find((i) => i.allowed);

    if (firstAllowed) {
      const cutoffId = getQualityProfileItemId(firstAllowed);

      if (cutoffId !== cutoff.value) {
        updateValue('cutoff', cutoffId);
      }
    }
  }, [isSchemaFetched, cutoff, items, updateValue]);

  const formatItemsSection = (
    <QualityProfileFormatItems
      profileFormatItems={formatItems.value}
      errors={formatItems.errors}
      warnings={formatItems.warnings}
      onQualityProfileFormatItemScoreChange={handleFormatItemScoreChange}
    />
  );

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>
        {id ? translate('EditQualityProfile') : translate('AddQualityProfile')}
      </ModalHeader>

      <ModalBody>
        {isSchemaFetched ? null : <LoadingIndicator />}

        {!isSchemaLoading && schemaError ? (
          <Alert kind={kinds.DANGER}>
            {translate('UnableToAddANewQualityProfilePleaseTryAgain')}
          </Alert>
        ) : null}

        {isSchemaFetched && !schemaError ? (
          <Form
            validationErrors={validationErrors}
            validationWarnings={validationWarnings}
          >
            <div className={styles.formGroupsContainer}>
              <div className={styles.formGroupWrapper}>
                <FormGroup size={sizes.EXTRA_SMALL}>
                  <FormLabel size={sizes.SMALL}>{translate('Name')}</FormLabel>

                  <FormInputGroup
                    type={inputTypes.TEXT}
                    name="name"
                    {...name}
                    onChange={handleInputChange}
                  />
                </FormGroup>

                <FormGroup size={sizes.EXTRA_SMALL}>
                  <FormLabel size={sizes.SMALL}>
                    {translate('UpgradesAllowed')}
                  </FormLabel>

                  <FormInputGroup
                    type={inputTypes.CHECK}
                    name="upgradeAllowed"
                    {...upgradeAllowed}
                    helpText={translate('UpgradeAllowedHelpText')}
                    onChange={handleInputChange}
                  />
                </FormGroup>

                {upgradeAllowed.value ? (
                  <FormGroup size={sizes.EXTRA_SMALL}>
                    <FormLabel size={sizes.SMALL}>
                      {translate('UpgradeUntil')}
                    </FormLabel>

                    <FormInputGroup
                      type={inputTypes.SELECT}
                      name="cutoff"
                      {...cutoff}
                      values={qualities}
                      helpText={translate('CutoffHelpText')}
                      onChange={handleCutoffChange}
                    />
                  </FormGroup>
                ) : null}

                {formatItems.value.length > 0 ? (
                  <FormGroup size={sizes.EXTRA_SMALL}>
                    <FormLabel size={sizes.SMALL}>
                      {translate('MinimumCustomFormatScore')}
                    </FormLabel>

                    <FormInputGroup
                      type={inputTypes.NUMBER}
                      name="minFormatScore"
                      {...minFormatScore}
                      helpText={translate('MinFormatScoreHelpText')}
                      onChange={handleInputChange}
                    />
                  </FormGroup>
                ) : null}

                {upgradeAllowed.value && formatItems.value.length > 0 ? (
                  <FormGroup size={sizes.EXTRA_SMALL}>
                    <FormLabel size={sizes.SMALL}>
                      {translate('UpgradeUntilCustomFormatScore')}
                    </FormLabel>

                    <FormInputGroup
                      type={inputTypes.NUMBER}
                      name="cutoffFormatScore"
                      {...cutoffFormatScore}
                      helpText={translate('CutoffFormatScoreHelpText')}
                      onChange={handleInputChange}
                    />
                  </FormGroup>
                ) : null}

                <div className={styles.formatItemLarge}>
                  {formatItemsSection}
                </div>
              </div>

              <div className={styles.qualitiesColumn}>
                <QualityProfileItems
                  mode={mode}
                  qualityProfileItems={items.value}
                  errors={items.errors}
                  warnings={items.warnings}
                  dropQualityIndex={dropQualityIndex}
                  dropPosition={dropPosition}
                  onChangeMode={setMode}
                  onCreateGroupPress={handleCreateGroupPress}
                  onDeleteGroupPress={handleDeleteGroupPress}
                  onItemAllowedChange={handleItemAllowedChange}
                  onGroupAllowedChange={handleGroupAllowedChange}
                  onItemGroupNameChange={handleGroupNameChange}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                />
              </div>

              <div className={styles.formatItemSmall}>{formatItemsSection}</div>
            </div>
          </Form>
        ) : null}
      </ModalBody>

      <ModalFooter>
        {id ? (
          <div
            className={styles.deleteButtonContainer}
            title={
              isInUse
                ? translate(
                    'IsInUseCantDeleteAQualityProfileThatIsAttachedToAnAuthorOrImportList'
                  )
                : undefined
            }
          >
            <Button
              kind={kinds.DANGER}
              isDisabled={isInUse}
              onPress={onDeleteQualityProfilePress}
            >
              {translate('Delete')}
            </Button>
          </div>
        ) : null}

        <Button onPress={onModalClose}>{translate('Cancel')}</Button>

        <SpinnerErrorButton
          isSpinning={isSaving}
          error={saveError}
          onPress={saveProvider}
        >
          {translate('Save')}
        </SpinnerErrorButton>
      </ModalFooter>
    </ModalContent>
  );
}

export default EditQualityProfileModalContent;
