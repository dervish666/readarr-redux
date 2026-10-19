import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import useTags, { Tag, useAddTag } from 'Tags/useTags';
import TagInput from './TagInput';

const validTagRegex = new RegExp('[^-_a-z0-9]', 'i');

function isValidTag(tagName: string) {
  try {
    return !validTagRegex.test(tagName);
  } catch {
    return false;
  }
}

interface TagInputTag {
  id?: number;
  name: string;
}

interface AuthorTagInputProps {
  name: string;
  value: number[];
  onChange: (change: { name: string; value: number[] }) => void;
  [key: string]: unknown;
}

// The tag input for author tags (inputTypes.TAG). Tags come from react-query and new
// ones are created through it; useAddTag also refreshes the redux tags feed.
function AuthorTagInput({
  name,
  value,
  onChange,
  ...otherProps
}: AuthorTagInputProps) {
  const { data: allTags, isFetched } = useTags();
  const hasCheckedValue = useRef(false);

  const sortedTags = useMemo(
    () => [...allTags].sort((a, b) => a.label.localeCompare(b.label)),
    [allTags]
  );

  const tags = useMemo(() => {
    return value.reduce<TagInputTag[]>((acc, id) => {
      const matchingTag = allTags.find((tag) => tag.id === id);

      if (matchingTag) {
        acc.push({ id, name: matchingTag.label });
      }

      return acc;
    }, []);
  }, [value, allTags]);

  const tagList = useMemo(() => {
    return sortedTags
      .filter((tag) => !value.includes(tag.id))
      .map(({ id, label }) => ({ id, name: label }));
  }, [sortedTags, value]);

  const handleTagCreated = useCallback(
    (tag: Tag) => {
      onChange({ name, value: [...value, tag.id] });
    },
    [name, value, onChange]
  );

  const { addTag } = useAddTag(handleTagCreated);

  // Drop ids of tags that no longer exist, once the tag list has loaded.
  useEffect(() => {
    if (!isFetched || hasCheckedValue.current) {
      return;
    }

    hasCheckedValue.current = true;

    if (value.length !== tags.length) {
      onChange({ name, value: tags.map((tag) => tag.id as number) });
    }
  }, [isFetched, name, value, tags, onChange]);

  const handleTagAdd = useCallback(
    (tag: TagInputTag) => {
      if (!tag.id) {
        const existingTag = allTags.some((t) => t.label === tag.name);

        if (isValidTag(tag.name) && !existingTag) {
          addTag({ label: tag.name });
        }

        return;
      }

      onChange({ name, value: [...value, tag.id] });
    },
    [name, value, allTags, addTag, onChange]
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
      tags={tags}
      tagList={tagList}
      onTagAdd={handleTagAdd}
      onTagDelete={handleTagDelete}
    />
  );
}

export default AuthorTagInput;
