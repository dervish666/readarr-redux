import React, { ComponentClass, ReactNode } from 'react';
import Link, { LinkProps } from 'Components/Link/Link';
import TableRowCell from './TableRowCell';
import styles from './TableRowCellButton.module.css';

interface TableRowCellButtonProps extends LinkProps {
  className?: string;
  children?: ReactNode;
}

// A table cell that is itself the button (Readarr's layout, so the whole cell is the
// click target).
function TableRowCellButton({
  className = styles.cell,
  ...otherProps
}: TableRowCellButtonProps) {
  return (
    <Link
      className={className}
      component={TableRowCell as unknown as ComponentClass<LinkProps>}
      {...otherProps}
    />
  );
}

export default TableRowCellButton;
