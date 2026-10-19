import React from 'react';
import { useUiSettingsValues } from 'Settings/UI/useUiSettings';
import RelativeDateCell from './RelativeDateCell';

function RelativeDateCellConnector(props) {
  const {
    showRelativeDates,
    shortDateFormat,
    longDateFormat,
    timeFormat
  } = useUiSettingsValues();

  return (
    <RelativeDateCell
      {...props}
      showRelativeDates={showRelativeDates}
      shortDateFormat={shortDateFormat}
      longDateFormat={longDateFormat}
      timeFormat={timeFormat}
    />
  );
}

export default RelativeDateCellConnector;
