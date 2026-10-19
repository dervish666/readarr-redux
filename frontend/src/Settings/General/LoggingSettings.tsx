import React from 'react';
import FieldSet from 'Components/FieldSet';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import { inputTypes } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import { GeneralSettingsSectionProps } from './GeneralSettingsSection';

const logLevelOptions = [
  { key: 'info', value: 'Info' },
  { key: 'debug', value: 'Debug' },
  { key: 'trace', value: 'Trace' },
];

function LoggingSettings({
  settings,
  onInputChange,
}: GeneralSettingsSectionProps) {
  const { logLevel } = settings;

  return (
    <FieldSet legend={translate('Logging')}>
      <FormGroup>
        <FormLabel>{translate('LogLevel')}</FormLabel>

        <FormInputGroup
          type={inputTypes.SELECT}
          name="logLevel"
          values={logLevelOptions}
          helpTextWarning={
            logLevel.value === 'trace'
              ? translate(
                  'LogLevelvalueTraceTraceLoggingShouldOnlyBeEnabledTemporarily'
                )
              : undefined
          }
          onChange={onInputChange}
          {...logLevel}
        />
      </FormGroup>
    </FieldSet>
  );
}

export default LoggingSettings;
