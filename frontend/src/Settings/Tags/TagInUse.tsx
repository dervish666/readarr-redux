import React from 'react';
import Label from 'Components/Label';
import { kinds } from 'Helpers/Props';

interface TagInUseProps {
  label: string;
  labelPlural?: string;
  count: number;
}

function TagInUse({ label, labelPlural, count }: TagInUseProps) {
  if (count === 0) {
    return null;
  }

  const text = count > 1 && labelPlural ? labelPlural : label;

  return (
    <Label kind={kinds.DEFAULT}>
      {count} {text.toLowerCase()}
    </Label>
  );
}

export default TagInUse;
