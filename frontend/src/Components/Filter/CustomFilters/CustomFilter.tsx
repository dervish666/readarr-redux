import React, { useCallback } from 'react';
import IconButton from 'Components/Link/IconButton';
import SpinnerIconButton from 'Components/Link/SpinnerIconButton';
import { useDeleteCustomFilter } from 'Filters/useCustomFilters';
import { icons } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import { SetFilter } from '../FilterModal';
import styles from './CustomFilter.module.css';

interface CustomFilterProps {
  id: number;
  label: string;
  selectedFilterKey?: string | number;
  dispatchSetFilter: (payload: SetFilter) => void;
  onEditPress: (id: number) => void;
}

function CustomFilter({
  id,
  label,
  selectedFilterKey,
  dispatchSetFilter,
  onEditPress,
}: CustomFilterProps) {
  const handleDeleted = useCallback(() => {
    if (id === selectedFilterKey) {
      dispatchSetFilter({ selectedFilterKey: 'all' });
    }
  }, [id, selectedFilterKey, dispatchSetFilter]);

  const { deleteCustomFilter, isDeleting } = useDeleteCustomFilter(
    id,
    handleDeleted
  );

  const handleEditPress = useCallback(() => {
    onEditPress(id);
  }, [id, onEditPress]);

  const handleRemovePress = useCallback(() => {
    deleteCustomFilter();
  }, [deleteCustomFilter]);

  return (
    <div className={styles.customFilter}>
      <div className={styles.label}>{label}</div>

      <div className={styles.actions}>
        <IconButton
          name={icons.EDIT}
          aria-label={translate('Edit')}
          onPress={handleEditPress}
        />

        <SpinnerIconButton
          title={translate('RemoveFilter')}
          aria-label={translate('RemoveFilter')}
          name={icons.REMOVE}
          isSpinning={isDeleting}
          onPress={handleRemovePress}
        />
      </div>
    </div>
  );
}

export default CustomFilter;
