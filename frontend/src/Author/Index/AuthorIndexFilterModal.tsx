import React, { useCallback } from 'react';
import useAuthors, { FILTER_BUILDER } from 'Author/useAuthors';
import FilterModal, { SetFilter } from 'Components/Filter/FilterModal';
import { CustomFilter } from 'Filters/Filter';
import { setAuthorIndexOption } from './authorIndexOptionsStore';
import { AUTHOR_INDEX_CUSTOM_FILTER_TYPE } from './useAuthorIndex';

interface AuthorIndexFilterModalProps {
  isOpen: boolean;
  selectedFilterKey?: string | number;
  customFilters: CustomFilter[];
  onModalClose: () => void;
}

function AuthorIndexFilterModal({
  isOpen,
  selectedFilterKey,
  customFilters,
  onModalClose,
}: AuthorIndexFilterModalProps) {
  const { data } = useAuthors();

  const dispatchSetFilter = useCallback(({ selectedFilterKey }: SetFilter) => {
    setAuthorIndexOption('selectedFilterKey', selectedFilterKey);
  }, []);

  return (
    <FilterModal
      isOpen={isOpen}
      selectedFilterKey={selectedFilterKey}
      customFilters={customFilters}
      customFilterType={AUTHOR_INDEX_CUSTOM_FILTER_TYPE}
      filterBuilderProps={FILTER_BUILDER}
      sectionItems={data}
      dispatchSetFilter={dispatchSetFilter}
      onModalClose={onModalClose}
    />
  );
}

export default AuthorIndexFilterModal;
