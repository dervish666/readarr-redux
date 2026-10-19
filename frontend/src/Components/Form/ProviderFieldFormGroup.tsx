import React, { useMemo } from 'react';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import { inputTypes } from 'Helpers/Props';
import { FieldSelectOption } from 'typings/Field';
import { Failure } from 'typings/pending';

interface ProviderFieldFormGroupProps {
  advancedSettings?: boolean;
  name: string;
  label: string;
  unit?: string;
  helpText?: string;
  helpTextWarning?: string;
  helpLink?: string;
  placeholder?: string;
  value?: unknown;
  type: string;
  advanced: boolean;
  hidden?: string;
  pending?: boolean;
  errors?: Failure[];
  warnings?: Failure[];
  selectOptions?: FieldSelectOption<unknown>[];
  selectOptionsProviderAction?: string;
  provider?: string;
  providerData?: object;
  onChange: (change: {
    name: string;
    value: unknown;
    additionalProperties?: Record<string, unknown>;
  }) => void;
  [key: string]: unknown;
}

function getType(type: string, selectOptionsProviderAction?: string) {
  switch (type) {
    case 'captcha':
      return inputTypes.CAPTCHA;
    case 'checkbox':
      return inputTypes.CHECK;
    case 'device':
      return inputTypes.DEVICE;
    case 'bookshelf':
      return inputTypes.BOOKSHELF;
    case 'password':
      return inputTypes.PASSWORD;
    case 'number':
      return inputTypes.NUMBER;
    case 'path':
    case 'filePath':
      return inputTypes.PATH;
    case 'select':
      return selectOptionsProviderAction
        ? inputTypes.DYNAMIC_SELECT
        : inputTypes.SELECT;
    case 'tag':
      return inputTypes.TEXT_TAG;
    case 'tagSelect':
      return inputTypes.TAG_SELECT;
    case 'textbox':
      return inputTypes.TEXT;
    case 'oAuth':
      return inputTypes.OAUTH;
    default:
      return inputTypes.TEXT;
  }
}

// One provider field (indexer, download client, notification, import list,
// metadata) as a form row. JS and TS callers pass the field spread from the
// provider's settings plus provider/providerData for inputs that ask the
// provider for options.
function ProviderFieldFormGroup({
  advancedSettings = false,
  name,
  label,
  helpText,
  helpTextWarning,
  helpLink,
  placeholder,
  value,
  type,
  advanced,
  hidden,
  pending = false,
  errors = [],
  warnings = [],
  selectOptions,
  selectOptionsProviderAction,
  onChange,
  ...otherProps
}: ProviderFieldFormGroupProps) {
  const values = useMemo(() => {
    if (!selectOptions) {
      return undefined;
    }

    return selectOptions.map((option) => ({
      key: option.value,
      value: option.name,
      hint: option.hint,
    }));
  }, [selectOptions]);

  if (hidden === 'hidden' || (hidden === 'hiddenIfNotSet' && !value)) {
    return null;
  }

  return (
    <FormGroup advancedSettings={advancedSettings} isAdvanced={advanced}>
      <FormLabel>{label}</FormLabel>

      <FormInputGroup
        type={getType(type, selectOptionsProviderAction)}
        name={name}
        helpText={helpText}
        helpTextWarning={helpTextWarning}
        helpLink={helpLink}
        value={value}
        values={values}
        errors={errors}
        warnings={warnings}
        pending={pending}
        onChange={onChange}
        {...{
          label,
          placeholder,
          selectOptionsProviderAction,
          includeFiles: type === 'filePath' ? true : undefined,
        }}
        {...otherProps}
      />
    </FormGroup>
  );
}

export default ProviderFieldFormGroup;
