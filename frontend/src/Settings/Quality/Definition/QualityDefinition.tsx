import React, { useCallback } from 'react';
import NumberInput from 'Components/Form/NumberInput';
import TextInput from 'Components/Form/TextInput';
import QualityDefinitionModel from 'typings/QualityDefinition';
import translate from 'Utilities/String/translate';
import { useManageQualityDefinitions } from './useQualityDefinitions';
import styles from './QualityDefinition.module.css';

// Sizes are stored in kilobits (128 bytes), so one MiB is 8192 of them
const KILOBITS_PER_MEGABYTE = 8192;

// Unknown Audio, MP3, FLAC and M4B. Matches Quality.Audio in NzbDrone.Core, the only
// qualities AcceptableSizeSpecification checks
const AUDIO_QUALITY_IDS = [10, 11, 12, 13];

interface QualityDefinitionProps extends QualityDefinitionModel {
  updateDefinition: ReturnType<
    typeof useManageQualityDefinitions
  >['updateDefinition'];
}

function QualityDefinition({
  id,
  quality,
  title,
  minSize,
  updateDefinition,
}: QualityDefinitionProps) {
  const isAudio = AUDIO_QUALITY_IDS.includes(quality.id);

  // Not rounded: 8192 is a power of two, so the MB value converts back to the stored
  // one exactly and focusing then leaving the input never rewrites a minimum
  const minSizeMegabytes = minSize ? minSize / KILOBITS_PER_MEGABYTE : 0;

  const handleTitleChange = useCallback(
    ({ value }: { value: string }) => {
      updateDefinition(id, 'title', value);
    },
    [id, updateDefinition]
  );

  const handleMinSizeChange = useCallback(
    ({ value }: { value: number | null }) => {
      const megabytes = value == null || value < 0 ? 0 : value;

      updateDefinition(id, 'minSize', megabytes * KILOBITS_PER_MEGABYTE);
    },
    [id, updateDefinition]
  );

  return (
    <div className={styles.qualityDefinition}>
      <div className={styles.quality}>{quality.name}</div>

      <div className={styles.title}>
        <TextInput
          name={`${id}.title`}
          value={title}
          onChange={handleTitleChange}
        />
      </div>

      <div className={styles.sizeLimit}>
        {isAudio ? (
          <div className={styles.minSize}>
            <NumberInput
              className={styles.sizeInput}
              name={`${id}.minSize`}
              value={minSizeMegabytes}
              min={0}
              step={1}
              isFloat={true}
              onChange={handleMinSizeChange}
            />

            <span className={styles.unit}>MB</span>

            {minSizeMegabytes ? null : (
              <span className={styles.note}>{translate('NoMinimum')}</span>
            )}
          </div>
        ) : (
          <div className={styles.note}>{translate('NotSizeChecked')}</div>
        )}
      </div>
    </div>
  );
}

export default QualityDefinition;
