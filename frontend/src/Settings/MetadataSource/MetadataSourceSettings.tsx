import React, { useCallback } from 'react';
import Alert from 'Components/Alert';
import FieldSet from 'Components/FieldSet';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputButton from 'Components/Form/FormInputButton';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageHeading from 'Components/Page/PageHeading';
import { inputTypes, kinds } from 'Helpers/Props';
import SettingsToolbarConnector from 'Settings/SettingsToolbarConnector';
import translate from 'Utilities/String/translate';
import {
  MetadataSourceProbe,
  ProbeResult,
  useManageMetadataSourceSettings,
} from './useMetadataSourceSettings';

function getProbeKind(probe: MetadataSourceProbe, probeFromSave: boolean) {
  if (probe.isOk) {
    return kinds.SUCCESS;
  }

  // A save always goes through, so a failing source after a save is a warning, not an error
  if (
    probeFromSave ||
    probe.status === 'notConfigured' ||
    probe.status === 'rateLimited'
  ) {
    return kinds.WARNING;
  }

  return kinds.DANGER;
}

function ProbeResultAlert({ probe, probeFromSave, testError }: ProbeResult) {
  if (testError) {
    return (
      <Alert kind={kinds.DANGER}>{translate('MetadataSourceTestError')}</Alert>
    );
  }

  if (!probe) {
    return null;
  }

  return (
    <Alert kind={getProbeKind(probe, probeFromSave)}>
      {probeFromSave && !probe.isOk
        ? `${translate('MetadataSourceSavedWithWarning')} ${probe.message}`
        : probe.message}
    </Alert>
  );
}

function MetadataSourceSettings() {
  const {
    settings,
    hasSettings,
    hasPendingChanges,
    validationErrors,
    validationWarnings,
    isFetched,
    error,
    isSaving,
    isTesting,
    probe,
    probeFromSave,
    testError,
    updateMetadataSource,
    saveSettings,
    testMetadataSource,
  } = useManageMetadataSourceSettings();

  const handleInputChange = useCallback(
    ({ value }: { name: string; value: string }) => {
      updateMetadataSource(value);
    },
    [updateMetadataSource]
  );

  return (
    <PageContent title={translate('MetadataSource')}>
      <SettingsToolbarConnector
        isSaving={isSaving}
        hasPendingChanges={hasPendingChanges}
        onSavePress={saveSettings}
      />

      <PageContentBody>
        <PageHeading
          scope={translate('Settings')}
          title={translate('MetadataSource')}
        />

        {isFetched ? null : <LoadingIndicator />}

        {isFetched && error ? (
          <Alert kind={kinds.DANGER}>
            {translate('UnableToLoadMetadataSourceSettings')}
          </Alert>
        ) : null}

        {hasSettings && isFetched && !error ? (
          <Form
            validationErrors={validationErrors}
            validationWarnings={validationWarnings}
          >
            <FieldSet legend={translate('MetadataSource')}>
              <Alert kind={kinds.INFO}>{translate('MetadataSourceInfo')}</Alert>

              <FormGroup>
                <FormLabel>{translate('MetadataSourceUrl')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.TEXT}
                  name="metadataSource"
                  helpText={translate('MetadataSourceHelpText')}
                  helpLink="https://github.com/blampe/rreading-glasses"
                  buttons={[
                    <FormInputButton
                      key="test"
                      canSpin={true}
                      isSpinning={isTesting}
                      onPress={testMetadataSource}
                    >
                      {translate('Test')}
                    </FormInputButton>,
                  ]}
                  onChange={handleInputChange}
                  {...settings.metadataSource}
                />
              </FormGroup>

              <ProbeResultAlert
                probe={probe}
                probeFromSave={probeFromSave}
                testError={testError}
              />

              <Alert kind={kinds.WARNING}>
                {translate('MetadataSourceIdWarning')}
              </Alert>
            </FieldSet>
          </Form>
        ) : null}
      </PageContentBody>
    </PageContent>
  );
}

export default MetadataSourceSettings;
