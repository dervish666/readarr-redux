import React, { useCallback } from 'react';
import FilterModal, { SetFilter } from 'Components/Filter/FilterModal';
import { CustomFilter } from 'Filters/Filter';
import InteractiveSearchPayload from './InteractiveSearchPayload';
import { setReleaseOption } from './releaseOptionsStore';
import useReleases, {
  FILTER_BUILDER,
  getSearchType,
  RELEASES_CUSTOM_FILTER_TYPE,
} from './useReleases';

interface InteractiveSearchFilterModalProps {
  isOpen: boolean;
  selectedFilterKey?: string | number;
  customFilters: CustomFilter[];
  searchPayload: InteractiveSearchPayload;
  onModalClose: () => void;
}

function InteractiveSearchFilterModal({
  isOpen,
  selectedFilterKey,
  customFilters,
  searchPayload,
  onModalClose,
}: InteractiveSearchFilterModalProps) {
  // Reads the search the tab already ran; opening the filter never starts one.
  const { allReleases } = useReleases(searchPayload, { enabled: false });

  const dispatchSetFilter = useCallback(
    ({ selectedFilterKey }: SetFilter) => {
      setReleaseOption(
        getSearchType(searchPayload) === 'book'
          ? 'bookSelectedFilterKey'
          : 'authorSelectedFilterKey',
        selectedFilterKey
      );
    },
    [searchPayload]
  );

  return (
    <FilterModal
      isOpen={isOpen}
      selectedFilterKey={selectedFilterKey}
      customFilters={customFilters}
      customFilterType={RELEASES_CUSTOM_FILTER_TYPE}
      filterBuilderProps={FILTER_BUILDER}
      sectionItems={allReleases}
      dispatchSetFilter={dispatchSetFilter}
      onModalClose={onModalClose}
    />
  );
}

export default InteractiveSearchFilterModal;
