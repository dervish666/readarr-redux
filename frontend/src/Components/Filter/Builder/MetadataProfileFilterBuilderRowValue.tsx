import React, { useMemo } from 'react';
import { useMetadataProfiles } from 'Settings/Profiles/Metadata/useMetadataProfiles';
import FilterBuilderRowValue from './FilterBuilderRowValue';

interface MetadataProfileFilterBuilderRowValueProps {
  [key: string]: unknown;
}

// The metadata profile filter's values are the metadata profiles.
function MetadataProfileFilterBuilderRowValue(
  props: MetadataProfileFilterBuilderRowValueProps
) {
  const { data } = useMetadataProfiles();

  const tagList = useMemo(
    () => data.map(({ id, name }) => ({ id, name })),
    [data]
  );

  return <FilterBuilderRowValue {...props} tagList={tagList} />;
}

export default MetadataProfileFilterBuilderRowValue;
