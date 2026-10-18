import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import Icon from 'Components/Icon';
import Link from 'Components/Link/Link';
import { icons } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import styles from './AdvancedSettingsButton.css';

function AdvancedSettingsButton(props) {
  const {
    advancedSettings,
    onAdvancedSettingsPress,
    showLabel
  } = props;

  return (
    <Link
      className={styles.button}
      title={advancedSettings ? translate('ShownClickToHide') : translate('HiddenClickToShow')}
      onPress={onAdvancedSettingsPress}
    >
      <div className={styles.iconWrapper}>
        <Icon
          name={icons.ADVANCED_SETTINGS}
          size={16}
        />

        <span
          className={classNames(
            styles.indicatorContainer,
            advancedSettings ? styles.enabled : styles.disabled
          )}
        >
          <Icon
            name={advancedSettings ? icons.CHECK_CIRCLE : icons.FATAL}
            size={9}
          />
        </span>
      </div>

      {
        showLabel ?
          <span className={styles.label}>
            {advancedSettings ? translate('HideAdvanced') : translate('ShowAdvanced')}
          </span> :
          null
      }
    </Link>
  );
}

AdvancedSettingsButton.propTypes = {
  advancedSettings: PropTypes.bool.isRequired,
  onAdvancedSettingsPress: PropTypes.func.isRequired,
  showLabel: PropTypes.bool.isRequired
};

AdvancedSettingsButton.defaultProps = {
  showLabel: true
};

export default AdvancedSettingsButton;
