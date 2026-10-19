import React, { useCallback, useMemo } from 'react';
import split from 'Utilities/String/split';
import TagInput from './TagInput';

interface TextTagInputProps {
  name: string;
  value: string | string[];
  onChange: (change: { name: string; value: string[] }) => void;
  [key: string]: unknown;
}

// inputTypes.TEXT_TAG: free text tags, stored as a list of strings.
function TextTagInput({
  name,
  value,
  onChange,
  ...otherProps
}: TextTagInputProps) {
  const valueArray = useMemo(
    () => (Array.isArray(value) ? value : (split(value) as string[])),
    [value]
  );

  const tags = useMemo(
    () =>
      valueArray.filter((tag) => !!tag).map((tag) => ({ id: tag, name: tag })),
    [valueArray]
  );

  const handleTagAdd = useCallback(
    (tag: { name: string }) => {
      // Split and trim tags before adding them, so tags pasted with commas and
      // spaces don't end up as one tag.
      const newTags = tag.name.startsWith('/') ? [tag.name] : split(tag.name);

      onChange({
        name,
        value: [...valueArray, ...newTags.map((t: string) => t.trim())],
      });
    },
    [name, valueArray, onChange]
  );

  const handleTagDelete = useCallback(
    ({ index }: { index: number }) => {
      const newValue = [...valueArray];
      newValue.splice(index, 1);

      onChange({ name, value: newValue });
    },
    [name, valueArray, onChange]
  );

  const handleTagReplace = useCallback(
    (tagToReplace: { index: number }, newTag: { name: string }) => {
      const newValue = [...valueArray];
      newValue.splice(tagToReplace.index, 1);
      newValue.push(newTag.name.trim());

      onChange({ name, value: newValue });
    },
    [name, valueArray, onChange]
  );

  return (
    <TagInput
      delimiters={['Tab', 'Enter', ',']}
      {...otherProps}
      name={name}
      tags={tags}
      tagList={[]}
      onTagAdd={handleTagAdd}
      onTagDelete={handleTagDelete}
      onTagReplace={handleTagReplace}
    />
  );
}

export default TextTagInput;
