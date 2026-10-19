import React, { useCallback, useEffect } from 'react';
import CheckInput from 'Components/Form/CheckInput';
import Icon from 'Components/Icon';
import { icons, kinds } from 'Helpers/Props';
import { InputChanged } from 'typings/inputs';
import { SelectStateInputProps } from 'typings/props';
import styles from './OrganizePreviewRow.module.css';

interface OrganizePreviewRowProps {
  id: number;
  existingPath: string;
  newPath: string;
  isSelected?: boolean;
  onSelectedChange: (change: SelectStateInputProps) => void;
}

function OrganizePreviewRow({
  id,
  existingPath,
  newPath,
  isSelected,
  onSelectedChange,
}: OrganizePreviewRowProps) {
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

      <div>
        <div>
          <Icon name={icons.SUBTRACT} kind={kinds.DANGER} />

          <span className={styles.path}>{existingPath}</span>
        </div>

        <div>
          <Icon name={icons.ADD} kind={kinds.SUCCESS} />

          <span className={styles.path}>{newPath}</span>
        </div>
      </div>
    </div>
  );
}

export default OrganizePreviewRow;
