import PropTypes from 'prop-types';
import React from 'react';
import Icon from 'Components/Icon';
import MenuButton from 'Components/Menu/MenuButton';
import styles from './PageMenuButton.css';

function PageMenuButton(props) {
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
            size={18}
          />
        </div>

        <div className={styles.label}>
          {text}
        </div>
      </div>
    </MenuButton>
  );
}

PageMenuButton.propTypes = {
  iconName: PropTypes.object.isRequired,
  text: PropTypes.string,
  indicator: PropTypes.bool.isRequired
};

PageMenuButton.defaultProps = {
  indicator: false
};

export default PageMenuButton;
