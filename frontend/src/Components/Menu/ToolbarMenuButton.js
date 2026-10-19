import PropTypes from 'prop-types';
import React from 'react';
import Icon from 'Components/Icon';
import MenuButton from 'Components/Menu/MenuButton';
import { icons } from 'Helpers/Props';
import styles from './ToolbarMenuButton.css';

function ToolbarMenuButton(props) {
  const {
    iconName,
    indicator,
    text,
    ...otherProps
  } = props;

  return (
    <MenuButton
      className={styles.menuButton}
      {...otherProps}
    >
      <div className={styles.inner}>
        <div className={styles.iconWrapper}>
          <Icon
            name={iconName}
            size={16}
          />

          {
            indicator &&
              <span className={styles.indicatorContainer}>
                <Icon
                  name={icons.CIRCLE}
                  size={7}
                />
              </span>
          }
        </div>

        {
          text ?
            <span className={styles.label}>{text}</span> :
            null
        }
      </div>
    </MenuButton>
  );
}

ToolbarMenuButton.propTypes = {
  iconName: PropTypes.object.isRequired,
  text: PropTypes.string,
  indicator: PropTypes.bool.isRequired
};

ToolbarMenuButton.defaultProps = {
  indicator: false
};

export default ToolbarMenuButton;
