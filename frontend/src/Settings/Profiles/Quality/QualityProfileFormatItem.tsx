import React, { useCallback } from 'react';
import NumberInput from 'Components/Form/NumberInput';
import styles from './QualityProfileFormatItem.css';

interface QualityProfileFormatItemProps {
  formatId: number;
  name: string;
  score?: number;
  onScoreChange: (formatId: number, score: number) => void;
}

function QualityProfileFormatItem({
  formatId,
  name,
  // A cleared input sends null; treat it as 0 like before.
  score = 0,
  onScoreChange,
}: QualityProfileFormatItemProps) {
  const handleScoreChange = useCallback(
    ({ value }: { value: number | null }) => {
      onScoreChange(formatId, value ?? 0);
    },
    [formatId, onScoreChange]
  );

  return (
    <div className={styles.qualityProfileFormatItemContainer}>
      <div className={styles.qualityProfileFormatItem}>
        <label className={styles.formatNameContainer}>
          <div className={styles.formatName}>{name}</div>

          <NumberInput
            {...{
              containerClassName: styles.scoreContainer,
              className: styles.scoreInput,
            }}
            name={name}
            value={score}
            onChange={handleScoreChange}
          />
        </label>
      </div>
    </div>
  );
}

export default QualityProfileFormatItem;
