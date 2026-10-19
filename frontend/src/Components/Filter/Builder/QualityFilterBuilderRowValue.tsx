import React, { useMemo } from 'react';
import { useQualityProfileSchema } from 'Settings/Profiles/Quality/useQualityProfiles';
import getQualities from 'Utilities/Quality/getQualities';
import FilterBuilderRowValue from './FilterBuilderRowValue';

interface QualityFilterBuilderRowValueProps {
  [key: string]: unknown;
}

// The quality filter's values are every quality in the quality profile schema.
function QualityFilterBuilderRowValue(
  props: QualityFilterBuilderRowValueProps
) {
  const { schema } = useQualityProfileSchema(true);

  const tagList = useMemo(() => getQualities(schema.items), [schema]);

  return <FilterBuilderRowValue {...props} tagList={tagList} />;
}

export default QualityFilterBuilderRowValue;
