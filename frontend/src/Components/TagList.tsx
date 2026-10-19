import React from 'react';
import { kinds } from 'Helpers/Props';
import { Tag } from 'Tags/useTags';
import Label from './Label';
import styles from './TagList.module.css';

interface TagListProps {
  tags: ReadonlyArray<number>;
  tagList: ReadonlyArray<Tag>;
}

function TagList({ tags, tagList }: TagListProps) {
  const sortedTags = tags
    .map((tagId) => tagList.find((tag) => tag.id === tagId))
    .filter((tag): tag is Tag => !!tag)
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className={styles.tags}>
      {sortedTags.map((tag) => {
        return (
          <Label key={tag.id} kind={kinds.INFO}>
            {tag.label}
          </Label>
        );
      })}
    </div>
  );
}

export default TagList;
