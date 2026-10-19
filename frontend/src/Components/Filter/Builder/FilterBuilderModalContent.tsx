import React, { useCallback, useMemo, useState } from 'react';
import FormInputGroup from 'Components/Form/FormInputGroup';
import Button from 'Components/Link/Button';
import SpinnerErrorButton from 'Components/Link/SpinnerErrorButton';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import {
  CustomFilter,
  FilterBuilderProp,
  PropertyFilter,
} from 'Filters/Filter';
import { useSaveCustomFilter } from 'Filters/useCustomFilters';
import { inputTypes } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import { SetFilter } from '../FilterModal';
import FilterBuilderRow from './FilterBuilderRow';
import styles from './FilterBuilderModalContent.module.css';

// FilterBuilderRow fills in key, type and value for an empty row.
type BuilderFilter = Partial<PropertyFilter>;

interface FilterBuilderModalContentProps<T> {
  id: number | null;
  customFilterType: string;
  sectionItems: T[];
  filterBuilderProps: FilterBuilderProp<T>[];
  customFilters: CustomFilter[];
  dispatchSetFilter: (payload: SetFilter) => void;
  onCancelPress: () => void;
  onModalClose: () => void;
}

function FilterBuilderModalContent<T>({
  id,
  customFilters,
  customFilterType,
  sectionItems,
  filterBuilderProps,
  dispatchSetFilter,
  onCancelPress,
  onModalClose,
}: FilterBuilderModalContentProps<T>) {
  const { saveCustomFilter, isSaving, saveError } = useSaveCustomFilter(id);

  const { initialLabel, initialFilters } = useMemo(() => {
    const customFilter = id
      ? customFilters.find((c) => c.id === id)
      : undefined;

    return {
      initialLabel: customFilter?.label ?? '',
      initialFilters: customFilter?.filters ?? [],
    };
  }, [id, customFilters]);

  const [label, setLabel] = useState(initialLabel);
  const [filters, setFilters] = useState<BuilderFilter[]>(
    initialFilters.length ? initialFilters : [{}]
  );
  const [labelErrors, setLabelErrors] = useState<{ message: string }[]>([]);

  const handleLabelChange = useCallback(({ value }: { value: string }) => {
    setLabel(value);
  }, []);

  const handleFilterChange = useCallback(
    (index: number, filter: BuilderFilter) => {
      setFilters((current) => {
        const newFilters = [...current];
        newFilters.splice(index, 1, filter);

        return newFilters;
      });
    },
    []
  );

  const handleAddFilterPress = useCallback(() => {
    setFilters((current) => [...current, {}]);
  }, []);

  const handleRemoveFilterPress = useCallback((index: number) => {
    setFilters((current) => {
      const newFilters = [...current];
      newFilters.splice(index, 1);

      return newFilters;
    });
  }, []);

  const handleSaveFilterPress = useCallback(() => {
    if (!label) {
      setLabelErrors([{ message: translate('LabelIsRequired') }]);

      return;
    }

    saveCustomFilter(
      {
        ...(id ? { id } : {}),
        type: customFilterType,
        label,
        filters: filters as PropertyFilter[],
      },
      {
        onSuccess: (savedFilter) => {
          dispatchSetFilter({ selectedFilterKey: savedFilter.id });
          onModalClose();
        },
      }
    );
  }, [
    id,
    customFilterType,
    label,
    filters,
    saveCustomFilter,
    dispatchSetFilter,
    onModalClose,
  ]);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>{translate('CustomFilter')}</ModalHeader>

      <ModalBody>
        <div className={styles.labelContainer}>
          <div className={styles.label}>{translate('Label')}</div>

          <div className={styles.labelInputContainer}>
            <FormInputGroup
              name="label"
              value={label}
              type={inputTypes.TEXT}
              errors={labelErrors}
              onChange={handleLabelChange}
            />
          </div>
        </div>

        <div className={styles.label}>{translate('Filters')}</div>

        <div className={styles.bordered}>
          {filters.map((filter, index) => {
            return (
              <FilterBuilderRow
                key={`${filter.key}-${index}`}
                index={index}
                sectionItems={sectionItems}
                filterBuilderProps={filterBuilderProps}
                filterKey={filter.key}
                filterValue={filter.value}
                filterType={filter.type}
                filterCount={filters.length}
                onAddPress={handleAddFilterPress}
                onRemovePress={handleRemoveFilterPress}
                onFilterChange={handleFilterChange}
              />
            );
          })}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button onPress={onCancelPress}>{translate('Cancel')}</Button>

        <SpinnerErrorButton
          isSpinning={isSaving}
          error={saveError}
          onPress={handleSaveFilterPress}
        >
          {translate('Save')}
        </SpinnerErrorButton>
      </ModalFooter>
    </ModalContent>
  );
}

export default FilterBuilderModalContent;
