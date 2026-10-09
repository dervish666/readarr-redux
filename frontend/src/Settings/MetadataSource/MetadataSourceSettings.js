import PropTypes from 'prop-types';
import React, { Component } from 'react';
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
import { inputTypes, kinds } from 'Helpers/Props';
import SettingsToolbarConnector from 'Settings/SettingsToolbarConnector';
import translate from 'Utilities/String/translate';

function getProbeKind(probe, probeFromSave) {
  if (probe.isOk) {
    return kinds.SUCCESS;
  }

  // A save always goes through, so a failing source after a save is a warning, not an error
  if (probeFromSave || probe.status === 'notConfigured' || probe.status === 'rateLimited') {
    return kinds.WARNING;
  }

  return kinds.DANGER;
}

function ProbeResult({ probe, probeFromSave, testError }) {
  if (testError) {
    return (
      <Alert kind={kinds.DANGER}>
        {translate('MetadataSourceTestError')}
      </Alert>
    );
  }

  if (!probe) {
    return null;
  }

  return (
    <Alert kind={getProbeKind(probe, probeFromSave)}>
      {
        probeFromSave && !probe.isOk ?
          `${translate('MetadataSourceSavedWithWarning')} ${probe.message}` :
          probe.message
      }
    </Alert>
  );
}

ProbeResult.propTypes = {
  probe: PropTypes.object,
  probeFromSave: PropTypes.bool.isRequired,
  testError: PropTypes.object
};

class MetadataSourceSettings extends Component {

  //
  // Render

  render() {
    const {
      isFetching,
      error,
      settings,
      hasSettings,
      isTesting,
      testError,
      probe,
      probeFromSave,
      onInputChange,
      onSavePress,
      onTestPress,
      ...otherProps
    } = this.props;

    return (
      <PageContent title={translate('MetadataSource')}>
        <SettingsToolbarConnector
          {...otherProps}
          onSavePress={onSavePress}
        />

        <PageContentBody>
          {
            isFetching &&
              <LoadingIndicator />
          }

          {
            !isFetching && error &&
              <Alert kind={kinds.DANGER}>
                {translate('UnableToLoadMetadataSourceSettings')}
              </Alert>
          }

          {
            hasSettings && !isFetching && !error &&
              <Form
                id="metadataSourceSettings"
                {...otherProps}
              >
                <FieldSet legend={translate('MetadataSource')}>
                  <Alert kind={kinds.INFO}>
                    {translate('MetadataSourceInfo')}
                  </Alert>

                  <FormGroup>
                    <FormLabel>
                      {translate('MetadataSourceUrl')}
                    </FormLabel>

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
                          onPress={onTestPress}
                        >
                          {translate('Test')}
                        </FormInputButton>
                      ]}
                      onChange={onInputChange}
                      {...settings.metadataSource}
                    />
                  </FormGroup>

                  <ProbeResult
                    probe={probe}
                    probeFromSave={probeFromSave}
                    testError={testError}
                  />

                  <Alert kind={kinds.WARNING}>
                    {translate('MetadataSourceIdWarning')}
                  </Alert>
                </FieldSet>
              </Form>
          }
        </PageContentBody>
      </PageContent>
    );
  }

}

MetadataSourceSettings.propTypes = {
  isFetching: PropTypes.bool.isRequired,
  error: PropTypes.object,
  settings: PropTypes.object.isRequired,
  hasSettings: PropTypes.bool.isRequired,
  isTesting: PropTypes.bool.isRequired,
  testError: PropTypes.object,
  probe: PropTypes.object,
  probeFromSave: PropTypes.bool.isRequired,
  onSavePress: PropTypes.func.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onTestPress: PropTypes.func.isRequired
};

export default MetadataSourceSettings;
