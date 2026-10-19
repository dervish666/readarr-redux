import React, { useCallback, useEffect } from 'react';
import DescriptionList from 'Components/DescriptionList/DescriptionList';
import DescriptionListItem from 'Components/DescriptionList/DescriptionListItem';
import CheckInput from 'Components/Form/CheckInput';
import Icon from 'Components/Icon';
import { icons } from 'Helpers/Props';
import { InputChanged } from 'typings/inputs';
import { SelectStateInputProps } from 'typings/props';
import formatBytes from 'Utilities/Number/formatBytes';
import { TagDifference } from './useRetagPreview';
import styles from './RetagPreviewRow.module.css';

function formatValue(field: string, value?: string) {
  if (value === undefined || value === '0' || value === '') {
    return <Icon name={icons.BAN} size={12} />;
  }

  if (field === 'Image Size') {
    return formatBytes(Number(value));
  }

  return value;
}

function formatChange(field: string, oldValue?: string, newValue?: string) {
  return (
    <div>
      {' '}
      {formatValue(field, oldValue)}{' '}
      <Icon name={icons.ARROW_RIGHT_NO_CIRCLE} size={12} />{' '}
      {formatValue(field, newValue)}{' '}
    </div>
  );
}

interface RetagPreviewRowProps {
  id: number;
  path: string;
  changes: TagDifference[];
  isSelected?: boolean;
  onSelectedChange: (change: SelectStateInputProps) => void;
}

function RetagPreviewRow({
  id,
  path,
  changes,
  isSelected,
  onSelectedChange,
}: RetagPreviewRowProps) {
  // Every file starts selected.
  useEffect(() => {
    onSelectedChange({ id, value: true, shiftKey: false });
  }, [id, onSelectedChange]);

  const handleSelectedChange = useCallback(
    ({ value, shiftKey }: InputChanged<boolean> & { shiftKey: boolean }) => {
      onSelectedChange({ id, value, shiftKey });
    },
    [id, onSelectedChange]
  );

  return (
    <div className={styles.row}>
      <CheckInput
        containerClassName={styles.selectedContainer}
        name={id.toString()}
        value={isSelected}
        onChange={handleSelectedChange}
      />

      <div className={styles.column}>
        <span className={styles.path}>{path}</span>

        <DescriptionList>
          {changes.map(({ field, oldValue, newValue }) => {
            return (
              <DescriptionListItem
                key={field}
                title={field}
                data={formatChange(field, oldValue, newValue)}
              />
            );
          })}
        </DescriptionList>
      </div>
    </div>
  );
}

export default RetagPreviewRow;
