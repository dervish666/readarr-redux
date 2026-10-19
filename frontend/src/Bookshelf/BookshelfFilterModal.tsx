import React, { useCallback } from 'react';
import useAuthors from 'Author/useAuthors';
import FilterModal, { SetFilter } from 'Components/Filter/FilterModal';
import { CustomFilter } from 'Filters/Filter';
import { setBookshelfOption } from './bookshelfOptionsStore';
import {
  BOOKSHELF_CUSTOM_FILTER_TYPE,
  BOOKSHELF_FILTER_BUILDER,
} from './useBookshelf';

interface BookshelfFilterModalProps {
  isOpen: boolean;
  selectedFilterKey?: string | number;
  customFilters: CustomFilter[];
  onModalClose: () => void;
}

function BookshelfFilterModal({
  isOpen,
  selectedFilterKey,
  customFilters,
  onModalClose,
}: BookshelfFilterModalProps) {
  const { data } = useAuthors();

  const dispatchSetFilter = useCallback(({ selectedFilterKey }: SetFilter) => {
    setBookshelfOption('selectedFilterKey', selectedFilterKey);
  }, []);

  return (
    <FilterModal
      isOpen={isOpen}
      selectedFilterKey={selectedFilterKey}
      customFilters={customFilters}
      customFilterType={BOOKSHELF_CUSTOM_FILTER_TYPE}
      filterBuilderProps={BOOKSHELF_FILTER_BUILDER}
      sectionItems={data}
      dispatchSetFilter={dispatchSetFilter}
      onModalClose={onModalClose}
    />
  );
}

export default BookshelfFilterModal;
