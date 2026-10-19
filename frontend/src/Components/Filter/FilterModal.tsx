import React, { useCallback, useState } from 'react';
import Modal from 'Components/Modal/Modal';
import { CustomFilter, FilterBuilderProp } from 'Filters/Filter';
import FilterBuilderModalContent from './Builder/FilterBuilderModalContent';
import CustomFiltersModalContent from './CustomFilters/CustomFiltersModalContent';

export interface SetFilter {
  selectedFilterKey: string | number;
}

export interface FilterModalProps<T> {
  isOpen: boolean;
  selectedFilterKey?: string | number;
  customFilters: CustomFilter[];
  customFilterType: string;
  filterBuilderProps: FilterBuilderProp<T>[];
  sectionItems: T[];
  dispatchSetFilter: (payload: SetFilter) => void;
  onModalClose: () => void;
}

function FilterModal<T>({
  isOpen,
  selectedFilterKey,
  customFilters,
  dispatchSetFilter,
  onModalClose,
  ...otherProps
}: FilterModalProps<T>) {
  const [id, setId] = useState<number | null>(null);
  const [filterBuilder, setFilterBuilder] = useState(!customFilters.length);

  const handleAddCustomFilter = useCallback(() => {
    setFilterBuilder(true);
  }, []);

  const handleEditCustomFilter = useCallback((customFilterId: number) => {
    setId(customFilterId);
    setFilterBuilder(true);
  }, []);

  const handleCancelPress = useCallback(() => {
    if (filterBuilder) {
      setId(null);
      setFilterBuilder(false);
    } else {
      onModalClose();
    }
  }, [filterBuilder, onModalClose]);

  const handleModalClose = useCallback(() => {
    setId(null);
    setFilterBuilder(false);
    onModalClose();
  }, [onModalClose]);

  return (
    <Modal isOpen={isOpen} onModalClose={handleModalClose}>
      {filterBuilder ? (
        <FilterBuilderModalContent
          {...otherProps}
          id={id}
          dispatchSetFilter={dispatchSetFilter}
          customFilters={customFilters}
          onCancelPress={handleCancelPress}
          onModalClose={handleModalClose}
        />
      ) : (
        <CustomFiltersModalContent
          selectedFilterKey={selectedFilterKey}
          customFilters={customFilters}
          dispatchSetFilter={dispatchSetFilter}
          onAddCustomFilter={handleAddCustomFilter}
          onEditCustomFilter={handleEditCustomFilter}
          onModalClose={handleModalClose}
        />
      )}
    </Modal>
  );
}

export default FilterModal;
