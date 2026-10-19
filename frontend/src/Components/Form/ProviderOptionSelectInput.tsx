import { isEqual } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import useProviderOptions, {
  getProviderDataKey,
  ProviderOptionsData,
} from 'Settings/useProviderOptions';
import { FieldSelectOption } from 'typings/Field';
import EnhancedSelectInput from './EnhancedSelectInput';

interface ProviderOptionSelectInputProps {
  provider: string;
  providerData: ProviderOptionsData;
  name: string;
  value: number | string | number[] | string[];
  selectOptionsProviderAction: string;
  onChange: (change: { name: string; value: unknown }) => void;
  [key: string]: unknown;
}

// inputTypes.DYNAMIC_SELECT: a select whose options come from a provider action.
// As before, the options load when the input mounts and load again when it opens
// after a field they depend on (base URL, API path, API key) has changed.
function ProviderOptionSelectInput({
  provider,
  providerData,
  selectOptionsProviderAction,
  ...otherProps
}: ProviderOptionSelectInputProps) {
  const currentKey = getProviderDataKey(providerData);
  const [requestKey, setRequestKey] = useState(currentKey);

  const { data, isFetching } = useProviderOptions<{
    options?: FieldSelectOption<unknown>[];
  }>({
    provider,
    action: selectOptionsProviderAction,
    providerData,
    requestKey,
  });

  const values = useMemo(
    () =>
      (data?.options ?? []).map((option) => ({
        key: option.value,
        value: option.name,
        hint: option.hint,
        parentKey: option.parentValue,
      })),
    [data]
  );

  const handleOpen = useCallback(() => {
    if (!isEqual(currentKey, requestKey)) {
      setRequestKey(currentKey);
    }
  }, [currentKey, requestKey]);

  return (
    <EnhancedSelectInput
      {...otherProps}
      isFetching={isFetching}
      values={values}
      onOpen={handleOpen}
    />
  );
}

export default ProviderOptionSelectInput;
