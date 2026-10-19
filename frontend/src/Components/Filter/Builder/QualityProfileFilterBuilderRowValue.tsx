import React, { useMemo } from 'react';
import { useQualityProfiles } from 'Settings/Profiles/Quality/useQualityProfiles';
import FilterBuilderRowValue from './FilterBuilderRowValue';

interface QualityProfileFilterBuilderRowValueProps {
  [key: string]: unknown;
}

// The quality profile filter's values are the quality profiles.
function QualityProfileFilterBuilderRowValue(
  props: QualityProfileFilterBuilderRowValueProps
) {
  const { data } = useQualityProfiles();

  const tagList = useMemo(
    () => data.map(({ id, name }) => ({ id, name })),
    [data]
  );

  return <FilterBuilderRowValue {...props} tagList={tagList} />;
}

export default QualityProfileFilterBuilderRowValue;
