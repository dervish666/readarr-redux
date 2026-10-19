import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQualityProfiles } from 'Settings/Profiles/Quality/useQualityProfiles';
import translate from 'Utilities/String/translate';
import SelectInput from './SelectInput';

export interface ProfileSelectOption {
  key: string | number;
  value: string;
  isDisabled?: boolean;
}

interface QualityProfileSelectInputProps {
  name: string;
  value?: string | number;
  includeNoChange?: boolean;
  includeNoChangeDisabled?: boolean;
  includeMixed?: boolean;
  onChange: (change: { name: string; value: string | number }) => void;
  [key: string]: unknown;
}

// inputTypes.QUALITY_PROFILE_SELECT. Profiles come from react-query; with no valid
// value the first profile is chosen once the list has loaded.
function QualityProfileSelectInput({
  name,
  value,
  includeNoChange = false,
  includeNoChangeDisabled = true,
  includeMixed = false,
  onChange,
  ...otherProps
}: QualityProfileSelectInputProps) {
  const { data, isSuccess } = useQualityProfiles();
  const hasSetDefault = useRef(false);

  const values = useMemo(() => {
    const result: ProfileSelectOption[] = [...data]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((profile) => ({ key: profile.id, value: profile.name }));

    if (includeNoChange) {
      result.unshift({
        key: 'noChange',
        value: translate('NoChange'),
        isDisabled: includeNoChangeDisabled,
      });
    }

    if (includeMixed) {
      result.unshift({ key: 'mixed', value: '(Mixed)', isDisabled: true });
    }

    return result;
  }, [data, includeNoChange, includeNoChangeDisabled, includeMixed]);

  const handleChange = useCallback(
    ({ value: newValue }: { name: string; value: string | number }) => {
      onChange({
        name,
        value: newValue === 'noChange' ? newValue : Number(newValue),
      });
    },
    [name, onChange]
  );

  useEffect(() => {
    // A failed load must not replace the saved value, so wait for a success.
    if (!isSuccess || hasSetDefault.current) {
      return;
    }

    hasSetDefault.current = true;

    if (
      !value ||
      !values.some(
        (option) => option.key === value || option.key === Number(value)
      )
    ) {
      const firstValue = values.find(
        (option) => typeof option.key === 'number'
      );

      if (firstValue) {
        handleChange({ name, value: firstValue.key });
      }
    }
  }, [isSuccess, name, value, values, handleChange]);

  return (
    <SelectInput
      {...otherProps}
      name={name}
      value={value ?? ''}
      values={values}
      onChange={handleChange}
    />
  );
}

export default QualityProfileSelectInput;
