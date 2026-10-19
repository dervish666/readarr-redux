import React, { useMemo } from 'react';
import { useIndexersData } from 'Settings/Indexers/useIndexers';
import FilterBuilderRowValue from './FilterBuilderRowValue';

interface IndexerFilterBuilderRowValueProps {
  [key: string]: unknown;
}

// The indexer filter's values are the configured indexers.
function IndexerFilterBuilderRowValue(
  props: IndexerFilterBuilderRowValueProps
) {
  const indexers = useIndexersData();

  const tagList = useMemo(
    () => indexers.map(({ id, name }) => ({ id, name })),
    [indexers]
  );

  return <FilterBuilderRowValue {...props} tagList={tagList} />;
}

export default IndexerFilterBuilderRowValue;
