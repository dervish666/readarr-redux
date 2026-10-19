import classNames from 'classnames';
import React, { ReactNode } from 'react';
import Button from 'Components/Link/Button';
import SpinnerButton from 'Components/Link/SpinnerButton';
import { kinds } from 'Helpers/Props';
import styles from './FormInputButton.css';

interface FormInputButtonProps {
  className?: string;
  isLastButton?: boolean;
  canSpin?: boolean;
  children?: ReactNode;
  [key: string]: unknown;
}

function FormInputButton({
  className = styles.button,
  canSpin = false,
  isLastButton = true,
  ...otherProps
}: FormInputButtonProps) {
  const buttonClassName = classNames(
    className,
    !isLastButton && styles.middleButton
  );

  if (canSpin) {
    return (
      <SpinnerButton
        className={buttonClassName}
        kind={kinds.PRIMARY}
        {...otherProps}
      />
    );
  }

  return (
    <Button className={buttonClassName} kind={kinds.PRIMARY} {...otherProps} />
  );
}

export default FormInputButton;
