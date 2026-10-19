import React from 'react';
import SortDirection from 'Helpers/Props/SortDirection';

type PropertyFunction<T> = () => T;

interface Column {
  name: string;
  className?: string;
  label: string | PropertyFunction<string> | React.ReactNode;
  columnLabel?: string | PropertyFunction<string>;
  isSortable?: boolean;
  fixedSortDirection?: SortDirection;
  isVisible: boolean;
  isModifiable?: boolean;
}

export default Column;
