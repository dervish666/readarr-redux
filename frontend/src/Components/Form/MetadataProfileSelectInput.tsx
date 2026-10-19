import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { metadataProfileNames } from 'Helpers/Props';
import { useMetadataProfiles } from 'Settings/Profiles/Metadata/useMetadataProfiles';
import translate from 'Utilities/String/translate';
import { ProfileSelectOption } from './QualityProfileSelectInput';
import SelectInput from './SelectInput';

interface MetadataProfileSelectInputProps {
  name: string;
  value?: string | number;
  includeNoChange?: boolean;
  includeNoChangeDisabled?: boolean;
  includeMixed?: boolean;
  includeNone?: boolean;
  onChange: (change: { name: string; value: string | number }) => void;
  [key: string]: unknown;
}

// inputTypes.METADATA_PROFILE_SELECT. The None profile goes last and only with
// includeNone; with no valid value the first profile is chosen once the list has
// loaded.
function MetadataProfileSelectInput({
  name,
  value,
  includeNoChange = false,
  includeNoChangeDisabled = true,
  includeMixed = false,
  includeNone = true,
  onChange,
  ...otherProps
}: MetadataProfileSelectInputProps) {
  const { data, isSuccess } = useMetadataProfiles();
  const hasSetDefault = useRef(false);

  const values = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
    const noneProfile = sorted.find(
      (profile) => profile.name === metadataProfileNames.NONE
    );

    const result: ProfileSelectOption[] = sorted
      .filter((profile) => profile !== noneProfile)
      .map((profile) => ({ key: profile.id, value: profile.name }));

    if (includeNone && noneProfile) {
      result.push({ key: noneProfile.id, value: noneProfile.name });
    }

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
  }, [
    data,
    includeNoChange,
    includeNoChangeDisabled,
    includeMixed,
    includeNone,
  ]);

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

export default MetadataProfileSelectInput;
