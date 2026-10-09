import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { clearPendingChanges } from 'Store/Actions/baseActions';
import { fetchMetadataSourceSettings, saveMetadataSourceSettings, setMetadataSourceSettingsValue, testMetadataSource } from 'Store/Actions/settingsActions';
import createSettingsSectionSelector from 'Store/Selectors/createSettingsSectionSelector';
import MetadataSourceSettings from './MetadataSourceSettings';

const SECTION = 'metadataSource';

function createMapStateToProps() {
  return createSelector(
    (state) => state.settings.advancedSettings,
    (state) => state.settings.metadataSource,
    createSettingsSectionSelector(SECTION),
    (advancedSettings, metadataSource, sectionSettings) => {
      const {
        isTesting,
        testError,
        probe,
        probeFromSave
      } = metadataSource;

      return {
        advancedSettings,
        isTesting,
        testError,
        probe,
        probeFromSave,
        ...sectionSettings
      };
    }
  );
}

const mapDispatchToProps = {
  setMetadataSourceSettingsValue,
  saveMetadataSourceSettings,
  fetchMetadataSourceSettings,
  testMetadataSource,
  clearPendingChanges
};

class MetadataSourceSettingsConnector extends Component {

  //
  // Lifecycle

  componentDidMount() {
    this.props.fetchMetadataSourceSettings();
  }

  componentWillUnmount() {
    this.props.clearPendingChanges({ section: `settings.${SECTION}` });
  }

  //
  // Listeners

  onInputChange = ({ name, value }) => {
    this.props.setMetadataSourceSettingsValue({ name, value });
  };

  onSavePress = () => {
    this.props.saveMetadataSourceSettings();
  };

  onTestPress = () => {
    this.props.testMetadataSource();
  };

  //
  // Render

  render() {
    return (
      <MetadataSourceSettings
        onInputChange={this.onInputChange}
        onSavePress={this.onSavePress}
        onTestPress={this.onTestPress}
        {...this.props}
      />
    );
  }
}

MetadataSourceSettingsConnector.propTypes = {
  setMetadataSourceSettingsValue: PropTypes.func.isRequired,
  saveMetadataSourceSettings: PropTypes.func.isRequired,
  fetchMetadataSourceSettings: PropTypes.func.isRequired,
  testMetadataSource: PropTypes.func.isRequired,
  clearPendingChanges: PropTypes.func.isRequired
};

export default connect(createMapStateToProps, mapDispatchToProps)(MetadataSourceSettingsConnector);
