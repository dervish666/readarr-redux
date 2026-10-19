import React, { MouseEvent, useCallback, useMemo } from 'react';
import FormInputHelpText from 'Components/Form/FormInputHelpText';
import { Failure } from 'typings/pending';
import translate from 'Utilities/String/translate';
import QualityProfileItemDragPreview from './QualityProfileItemDragPreview';
import QualityProfileItemDragSource, {
  EditQualityProfileMode,
  QualityProfileItemDragSourceActionProps,
} from './QualityProfileItemDragSource';
import {
  isQualityItem,
  QualityProfileItems as Items,
} from './useQualityProfiles';
import styles from './QualityProfileItems.css';

interface QualityProfileItemsProps
  extends QualityProfileItemDragSourceActionProps {
  mode: EditQualityProfileMode;
  dropQualityIndex: string | null;
  dropPosition: string | null;
  qualityProfileItems: Items;
  errors?: Failure[];
  warnings?: Failure[];
  onChangeMode: (mode: EditQualityProfileMode) => void;
}

interface ModeOption {
  key: EditQualityProfileMode;
  label: string;
}

function QualityProfileItems({
  mode,
  dropQualityIndex,
  dropPosition,
  qualityProfileItems,
  errors = [],
  warnings = [],
  onChangeMode,
  ...otherProps
}: QualityProfileItemsProps) {
  const isDragging = dropQualityIndex !== null;
  const isDraggingUp = isDragging && dropPosition === 'above';
  const isDraggingDown = isDragging && dropPosition === 'below';

  const modeOptions: ModeOption[] = useMemo(
    () => [
      { key: 'default', label: translate('Qualities') },
      { key: 'editGroups', label: translate('Groups') },
    ],
    []
  );

  const handleSelectMode = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const next = event.currentTarget.dataset.modeKey as
        | EditQualityProfileMode
        | undefined;

      if (next) {
        onChangeMode(next);
      }
    },
    [onChangeMode]
  );

  return (
    <div className={styles.qualitiesSection}>
      <div className={styles.headingRow}>
        <h3 className={styles.heading}>{translate('Qualities')}</h3>

        <div
          className={styles.modeCluster}
          role="group"
          aria-label={translate('EditGroups')}
        >
          {modeOptions.map((option) => {
            const isActive = mode === option.key;

            return (
              <button
                key={option.key}
                type="button"
                className={isActive ? styles.modeCellActive : styles.modeCell}
                data-mode-key={option.key}
                aria-pressed={isActive}
                onClick={handleSelectMode}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <FormInputHelpText text={translate('QualitiesHelpText')} />

      {errors.map((error, index) => {
        return (
          <FormInputHelpText
            key={index}
            text={error.message}
            isError={true}
            isCheckInput={false}
          />
        );
      })}

      {warnings.map((warning, index) => {
        return (
          <FormInputHelpText
            key={index}
            text={warning.message}
            isWarning={true}
            isCheckInput={false}
          />
        );
      })}

      <div className={styles.qualities}>
        {qualityProfileItems
          .map((item, index) => {
            if (isQualityItem(item)) {
              return (
                <QualityProfileItemDragSource
                  key={item.quality.id}
                  {...otherProps}
                  mode={mode}
                  qualityId={item.quality.id}
                  name={item.quality.name}
                  allowed={item.allowed}
                  qualityIndex={`${index + 1}`}
                  isInGroup={false}
                  isDraggingUp={isDraggingUp}
                  isDraggingDown={isDraggingDown}
                />
              );
            }

            return (
              <QualityProfileItemDragSource
                key={`group-${item.id}`}
                {...otherProps}
                mode={mode}
                groupId={item.id}
                name={item.name}
                allowed={item.allowed}
                items={item.items}
                qualityIndex={`${index + 1}`}
                isInGroup={false}
                isDraggingUp={isDraggingUp}
                isDraggingDown={isDraggingDown}
              />
            );
          })
          .reverse()}

        <QualityProfileItemDragPreview />
      </div>
    </div>
  );
}

export default QualityProfileItems;
