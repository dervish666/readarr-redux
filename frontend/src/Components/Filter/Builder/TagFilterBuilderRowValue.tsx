import React, { useMemo } from 'react';
import { useTagList } from 'Tags/useTags';
import FilterBuilderRowValue from './FilterBuilderRowValue';

interface TagFilterBuilderRowValueProps {
  [key: string]: unknown;
}

// The tag filter's values are the tags from GET /tag.
function TagFilterBuilderRowValue(props: TagFilterBuilderRowValueProps) {
  const tags = useTagList();

  const tagList = useMemo(
    () => tags.map(({ id, label }) => ({ id, name: label })),
    [tags]
  );

  return <FilterBuilderRowValue {...props} tagList={tagList} />;
}

export default TagFilterBuilderRowValue;
