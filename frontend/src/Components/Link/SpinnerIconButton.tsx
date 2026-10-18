import { LucideIcon } from 'lucide-react';
import React from 'react';
import { icons } from 'Helpers/Props';
import IconButton from './IconButton';
import { LinkProps } from './Link';

export interface SpinnerIconButtonProps extends Omit<LinkProps, 'name'> {
  name: LucideIcon;
  spinningName?: LucideIcon;
  kind?: string;
  size?: number;
  isDisabled?: boolean;
  isSpinning?: boolean;
}

function SpinnerIconButton({
  name,
  spinningName = icons.SPINNER,
  isDisabled = false,
  isSpinning = false,
  ...otherProps
}: SpinnerIconButtonProps) {
  return (
    <IconButton
      name={isSpinning ? spinningName || name : name}
      isDisabled={isDisabled || isSpinning}
      isSpinning={isSpinning}
      {...otherProps}
    />
  );
}

export default SpinnerIconButton;
