import React, { useCallback, useMemo } from 'react';
import { useIndexersData } from 'Settings/Indexers/useIndexers';
import translate from 'Utilities/String/translate';
import EnhancedSelectInput from './EnhancedSelectInput';

interface IndexerSelectInputProps {
  name: string;
  value: number | string;
  includeAny?: boolean;
  onChange: (change: { name: string; value: number }) => void;
  [key: string]: unknown;
}

// inputTypes.INDEXER_SELECT: the configured indexers by name, 0 for "Any".
function IndexerSelectInput({
  includeAny = false,
  onChange,
  ...otherProps
}: IndexerSelectInputProps) {
  const indexers = useIndexersData();

  const values = useMemo(() => {
    const options: { key: number; value: string }[] = [...indexers]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((indexer) => ({
        key: indexer.id,
        value: indexer.name,
      }));

    if (includeAny) {
      options.unshift({ key: 0, value: `(${translate('Any')})` });
    }

    return options;
  }, [indexers, includeAny]);

  const handleChange = useCallback(
    ({ name, value }: { name: string; value: number | string }) => {
      onChange({ name, value: parseInt(String(value)) });
    },
    [onChange]
  );

  return (
    <EnhancedSelectInput
      {...otherProps}
      values={values}
      onChange={handleChange}
    />
  );
}

export default IndexerSelectInput;
