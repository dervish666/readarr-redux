import React, { useCallback, useMemo } from 'react';
import useIndexerFlags from 'Settings/Indexers/useIndexerFlags';
import EnhancedSelectInput from './EnhancedSelectInput';

interface IndexerFlagsSelectInputProps {
  name: string;
  indexerFlags: number;
  onChange(payload: object): void;
}

// The flags are a bit field: the select edits the set bits, the value is their sum.
function IndexerFlagsSelectInput(props: IndexerFlagsSelectInputProps) {
  const { indexerFlags, onChange } = props;
  const { data: allIndexerFlags } = useIndexerFlags();

  const { value, values } = useMemo(() => {
    return {
      value: allIndexerFlags.reduce((acc: number[], { id }) => {
        // eslint-disable-next-line no-bitwise
        if ((indexerFlags & id) === id) {
          acc.push(id);
        }

        return acc;
      }, []),
      values: allIndexerFlags.map(({ id, name }) => ({
        key: id,
        value: name,
      })),
    };
  }, [allIndexerFlags, indexerFlags]);

  const onChangeWrapper = useCallback(
    ({ name, value }: { name: string; value: number[] }) => {
      const indexerFlags = value.reduce((acc, flagId) => acc + flagId, 0);

      onChange({ name, value: indexerFlags });
    },
    [onChange]
  );

  return (
    <EnhancedSelectInput
      {...props}
      value={value}
      values={values}
      onChange={onChangeWrapper}
    />
  );
}

export default IndexerFlagsSelectInput;
