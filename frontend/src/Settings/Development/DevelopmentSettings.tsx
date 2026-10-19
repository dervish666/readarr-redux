import React, { useCallback } from 'react';
import Alert from 'Components/Alert';
import FieldSet from 'Components/FieldSet';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageHeading from 'Components/Page/PageHeading';
import { inputTypes, kinds } from 'Helpers/Props';
import SettingsToolbar from 'Settings/SettingsToolbar';
import { InputChanged } from 'typings/inputs';
import translate from 'Utilities/String/translate';
import {
  DevelopmentSettingsModel,
  useManageDevelopmentSettings,
} from './useDevelopmentSettings';

const logLevelOptions = [
  { key: 'info', value: 'Info' },
  { key: 'debug', value: 'Debug' },
  { key: 'trace', value: 'Trace' },
];

function DevelopmentSettings() {
  const {
    settings,
    hasSettings,
    hasPendingChanges,
    validationErrors,
    validationWarnings,
    isFetching,
    isFetched,
    isSaving,
    error,
    updateSetting,
    saveSettings,
  } = useManageDevelopmentSettings();

  const handleInputChange = useCallback(
    ({ name, value }: InputChanged) => {
      updateSetting(
        name as keyof DevelopmentSettingsModel,
        value as DevelopmentSettingsModel[keyof DevelopmentSettingsModel]
      );
    },
    [updateSetting]
  );

  return (
    <PageContent title={translate('Development')}>
      <SettingsToolbar
        isSaving={isSaving}
        hasPendingChanges={hasPendingChanges}
        onSavePress={saveSettings}
      />

      <PageContentBody>
        <PageHeading
          scope={translate('Settings')}
          title={translate('Development')}
        />

        {isFetching && !isFetched ? <LoadingIndicator /> : null}

        {isFetched && error ? (
          <Alert kind={kinds.DANGER}>
            {translate('UnableToLoadDevelopmentSettings')}
          </Alert>
        ) : null}

        {hasSettings && isFetched && !error ? (
          <Form
            validationErrors={validationErrors}
            validationWarnings={validationWarnings}
          >
            <FieldSet legend={translate('Logging')}>
              <FormGroup>
                <FormLabel>{translate('LogRotation')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.NUMBER}
                  name="logRotate"
                  helpText={translate('LogRotateHelpText')}
                  onChange={handleInputChange}
                  {...settings.logRotate}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>{translate('ConsoleLogLevel')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.SELECT}
                  name="consoleLogLevel"
                  values={logLevelOptions}
                  onChange={handleInputChange}
                  {...settings.consoleLogLevel}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>{translate('LogSQL')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.CHECK}
                  name="logSql"
                  helpText={translate('LogSqlHelpText')}
                  onChange={handleInputChange}
                  {...settings.logSql}
                />
              </FormGroup>
            </FieldSet>

            <FieldSet legend={translate('Analytics')}>
              <FormGroup>
                <FormLabel>{translate('FilterAnalyticsEvents')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.CHECK}
                  name="filterSentryEvents"
                  helpText={translate('FilterSentryEventsHelpText')}
                  onChange={handleInputChange}
                  {...settings.filterSentryEvents}
                />
              </FormGroup>
            </FieldSet>
          </Form>
        ) : null}
      </PageContentBody>
    </PageContent>
  );
}

export default DevelopmentSettings;
