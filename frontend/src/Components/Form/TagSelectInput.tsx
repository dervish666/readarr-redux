import React, { useCallback, useMemo } from 'react';
import TagInput from './TagInput';

interface TagSelectOption {
  key: number;
  value: string;
}

interface TagSelectInputProps {
  name: string;
  value: number[];
  values: TagSelectOption[];
  onChange: (change: { name: string; value: number[] }) => void;
  [key: string]: unknown;
}

// inputTypes.TAG_SELECT: a tag input limited to the given values (no new tags).
function TagSelectInput({
  name,
  value,
  values,
  onChange,
  ...otherProps
}: TagSelectInputProps) {
  const sortedValues = useMemo(
    () => [...values].sort((a, b) => a.value.localeCompare(b.value)),
    [values]
  );

  const tags = useMemo(() => {
    return value.reduce<{ id: number; name: string }[]>((acc, id) => {
      const match = values.find((option) => option.key === id);

      if (match) {
        acc.push({ id, name: match.value });
      }

      return acc;
    }, []);
  }, [value, values]);

  const tagList = useMemo(
    () =>
      sortedValues.map(({ key, value: label }) => ({ id: key, name: label })),
    [sortedValues]
  );

  const handleTagAdd = useCallback(
    (tag: { id: number }) => {
      const newValue = value.slice();

      if (values.some((option) => option.key === tag.id)) {
        newValue.push(tag.id);
      }

      onChange({ name, value: newValue });
    },
    [name, value, values, onChange]
  );

  const handleTagDelete = useCallback(
    ({ index }: { index: number }) => {
      const newValue = value.slice();
      newValue.splice(index, 1);

      onChange({ name, value: newValue });
    },
    [name, value, onChange]
  );

  return (
    <TagInput
      {...otherProps}
      name={name}
      tags={tags}
      tagList={tagList}
      onTagAdd={handleTagAdd}
      onTagDelete={handleTagDelete}
    />
  );
}

export default TagSelectInput;
