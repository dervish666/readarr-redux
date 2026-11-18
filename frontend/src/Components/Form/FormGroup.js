import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { useId } from 'react';
import { map } from 'Helpers/elementChildren';
import { sizes } from 'Helpers/Props';
import FormFieldContext from './FormFieldContext';
import styles from './FormGroup.module.css';

function FormGroup(props) {
  const id = useId();
  const {
    className,
    children,
    size,
    advancedSettings,
    isAdvanced,
    ...otherProps
  } = props;

  if (!advancedSettings && isAdvanced) {
    return null;
  }

  const input = React.Children.toArray(children).find((child) => React.isValidElement(child) && child.props.name);
  const field = { id, name: input?.props.name };
  const childProps = isAdvanced ? { isAdvanced } : {};

  return (
    <FormFieldContext.Provider value={field}>
      <div
        className={classNames(
          className,
          styles[size]
        )}
        {...otherProps}
      >
        {
          map(children, (child) => {
            return React.cloneElement(child, childProps);
          })
        }
      </div>
    </FormFieldContext.Provider>
  );
}

FormGroup.propTypes = {
  className: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  size: PropTypes.oneOf(sizes.all).isRequired,
  advancedSettings: PropTypes.bool.isRequired,
  isAdvanced: PropTypes.bool.isRequired
};

FormGroup.defaultProps = {
  className: styles.group,
  size: sizes.SMALL,
  advancedSettings: false,
  isAdvanced: false
};

export default FormGroup;
