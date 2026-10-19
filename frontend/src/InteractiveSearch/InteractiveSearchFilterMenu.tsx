import React, { useCallback, useMemo } from 'react';
import FilterMenu from 'Components/Menu/FilterMenu';
import PageMenuButton from 'Components/Menu/PageMenuButton';
import { useCustomFiltersList } from 'Filters/useCustomFilters';
import { align } from 'Helpers/Props';
import InteractiveSearchFilterModal from './InteractiveSearchFilterModal';
import InteractiveSearchPayload from './InteractiveSearchPayload';
import { setReleaseOption } from './releaseOptionsStore';
import {
  FILTERS,
  getSearchType,
  RELEASES_CUSTOM_FILTER_TYPE,
  useSelectedReleaseFilterKey,
} from './useReleases';

interface InteractiveSearchFilterMenuProps {
  searchPayload: InteractiveSearchPayload;
}

// The author and book searches keep a selected filter each; both list the
// 'releases' custom filters.
function InteractiveSearchFilterMenu({
  searchPayload,
}: InteractiveSearchFilterMenuProps) {
  const customFilters = useCustomFiltersList(RELEASES_CUSTOM_FILTER_TYPE);
  const selectedFilterKey = useSelectedReleaseFilterKey(searchPayload);

  const handleFilterSelect = useCallback(
    (selectedFilterKey: string | number) => {
      setReleaseOption(
        getSearchType(searchPayload) === 'book'
          ? 'bookSelectedFilterKey'
          : 'authorSelectedFilterKey',
        selectedFilterKey
      );
    },
    [searchPayload]
  );

  const filterModalProps = useMemo(() => ({ searchPayload }), [searchPayload]);

  return (
    <FilterMenu
      alignMenu={align.RIGHT}
      selectedFilterKey={selectedFilterKey}
      filters={FILTERS}
      customFilters={customFilters}
      buttonComponent={PageMenuButton}
      filterModalConnectorComponent={InteractiveSearchFilterModal}
      filterModalConnectorComponentProps={filterModalProps}
      onFilterSelect={handleFilterSelect}
    />
  );
}

export default InteractiveSearchFilterMenu;
