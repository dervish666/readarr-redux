import { orderBy } from 'lodash';
import React, { useCallback, useMemo } from 'react';
import Edition from 'Book/Edition';
import { InputChanged } from 'typings/inputs';
import titleCase from 'Utilities/String/titleCase';
import SelectInput from './SelectInput';

// inputTypes.BOOK_EDITION_SELECT: picks the book's monitored edition. The value is
// the book's whole edition list (GET /edition?bookId=); a change answers with the
// same list, the chosen edition monitored and every other one not, so the book PUT
// carries each EditionResource field for field.

interface BookEditionSelectInputProps {
  name: string;
  value: Edition[];
  isDisabled?: boolean;
  onChange: (change: InputChanged<Edition[]>) => void;
}

function getLabel(edition: Edition) {
  let label = `${edition.title}`;

  if (edition.disambiguation) {
    label = `${label} (${titleCase(edition.disambiguation)})`;
  }

  const extras: string[] = [];

  if (edition.language) {
    extras.push(edition.language);
  }

  if (edition.publisher) {
    extras.push(edition.publisher);
  }

  if (edition.isbn13) {
    extras.push(edition.isbn13);
  }

  if (edition.format) {
    extras.push(edition.format);
  }

  if (edition.pageCount > 0) {
    extras.push(`${edition.pageCount}p`);
  }

  return `${label} [${extras.join(', ')}]`;
}

function BookEditionSelectInput({
  name,
  value: editions,
  onChange,
  ...otherProps
}: BookEditionSelectInputProps) {
  const values = useMemo(() => {
    return orderBy(
      editions.map((edition) => ({
        key: edition.foreignEditionId,
        value: getLabel(edition),
      })),
      ['value']
    );
  }, [editions]);

  const value =
    editions.find((edition) => edition.monitored)?.foreignEditionId ?? '';

  const handleChange = useCallback(
    ({ value: foreignEditionId }: InputChanged<string>) => {
      onChange({
        name,
        value: editions.map((edition) => ({
          ...edition,
          monitored: edition.foreignEditionId === foreignEditionId,
        })),
      });
    },
    [name, editions, onChange]
  );

  return (
    <SelectInput
      {...otherProps}
      name={name}
      value={value}
      values={values}
      onChange={handleChange}
    />
  );
}

export default BookEditionSelectInput;
