import React from 'react';
import { useAuthor } from 'Author/useAuthors';
import Label from 'Components/Label';
import { kinds, sizes } from 'Helpers/Props';
import { useTagList } from 'Tags/useTags';

interface AuthorTagsProps {
  authorId: number;
}

function AuthorTags({ authorId }: AuthorTagsProps) {
  const author = useAuthor(authorId);
  const tagList = useTagList();

  const tags = (author?.tags ?? [])
    .map((tagId) => tagList.find((tag) => tag.id === tagId)?.label)
    .filter((label): label is string => !!label)
    .sort((a, b) => a.localeCompare(b));

  return (
    <div>
      {tags.map((tag) => (
        <Label key={tag} kind={kinds.INFO} size={sizes.LARGE}>
          {tag}
        </Label>
      ))}
    </div>
  );
}

export default AuthorTags;
