import React, { useCallback } from 'react';
import useBooks from 'Book/useBooks';
import FilterModal, { SetFilter } from 'Components/Filter/FilterModal';
import { CustomFilter } from 'Filters/Filter';
import { FILTER_BUILDER } from './bookIndexFilters';
import { setBookIndexOption } from './bookIndexOptionsStore';
import { BOOK_INDEX_CUSTOM_FILTER_TYPE } from './useBookIndex';

interface BookIndexFilterModalProps {
  isOpen: boolean;
  selectedFilterKey?: string | number;
  customFilters: CustomFilter[];
  onModalClose: () => void;
}

function BookIndexFilterModal({
  isOpen,
  selectedFilterKey,
  customFilters,
  onModalClose,
}: BookIndexFilterModalProps) {
  const { data } = useBooks();

  const dispatchSetFilter = useCallback(({ selectedFilterKey }: SetFilter) => {
    setBookIndexOption('selectedFilterKey', selectedFilterKey);
  }, []);

  return (
    <FilterModal
      isOpen={isOpen}
      selectedFilterKey={selectedFilterKey}
      customFilters={customFilters}
      customFilterType={BOOK_INDEX_CUSTOM_FILTER_TYPE}
      filterBuilderProps={FILTER_BUILDER}
      sectionItems={data}
      dispatchSetFilter={dispatchSetFilter}
      onModalClose={onModalClose}
    />
  );
}

export default BookIndexFilterModal;
