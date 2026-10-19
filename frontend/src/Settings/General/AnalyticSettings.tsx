import React from 'react';
import FieldSet from 'Components/FieldSet';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import { inputTypes, sizes } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import { GeneralSettingsSectionProps } from './GeneralSettingsSection';

function AnalyticSettings({
  settings,
  onInputChange,
}: GeneralSettingsSectionProps) {
  return (
    <FieldSet legend={translate('Analytics')}>
      <FormGroup size={sizes.MEDIUM}>
        <FormLabel>{translate('SendAnonymousUsageData')}</FormLabel>

        <FormInputGroup
          type={inputTypes.CHECK}
          name="analyticsEnabled"
          helpText={translate('AnalyticsEnabledHelpText')}
          helpTextWarning={translate('AnalyticsEnabledHelpTextWarning')}
          onChange={onInputChange}
          {...settings.analyticsEnabled}
        />
      </FormGroup>
    </FieldSet>
  );
}

export default AnalyticSettings;
