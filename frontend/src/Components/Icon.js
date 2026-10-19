import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { kinds } from 'Helpers/Props';
import styles from './Icon.css';

// Icons are lucide-react components (Helpers/Props/icons.js), as in Sonarr's v5 Icon (d9e7ea050).

class Icon extends PureComponent {

  //
  // Render

  render() {
    const {
      containerClassName,
      className,
      name: IconComponent,
      kind,
      size,
      title,
      isSpinning,
      filled,
      // FontAwesome-only prop, taken out so it never lands on the <svg>
      fixedWidth,
      ...otherProps
    } = this.props;

    const icon = (
      <IconComponent
        className={classNames(
          styles.icon,
          className,
          styles[kind],
          isSpinning && styles.spinning
        )}
        size={size}
        strokeWidth={2}
        fill={filled ? 'currentColor' : 'none'}
        {...otherProps}
      />
    );

    if (title) {
      return (
        <span
          className={containerClassName}
          title={typeof title === 'function' ? title() : title}
        >
          {icon}
        </span>
      );
    }

    return icon;
  }
}

Icon.propTypes = {
  containerClassName: PropTypes.string,
  className: PropTypes.string,
  name: PropTypes.oneOfType([PropTypes.object, PropTypes.func]).isRequired,
  kind: PropTypes.string.isRequired,
  size: PropTypes.number.isRequired,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  isSpinning: PropTypes.bool.isRequired,
  filled: PropTypes.bool.isRequired,
  fixedWidth: PropTypes.bool.isRequired
};

Icon.defaultProps = {
  kind: kinds.DEFAULT,
  size: 14,
  isSpinning: false,
  filled: false,
  fixedWidth: false
};

export default Icon;
