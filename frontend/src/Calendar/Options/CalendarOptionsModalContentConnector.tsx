import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AppState from 'App/State/AppState';
import {
  UiSettingsModel,
  useSaveUiSettings,
  useUiSettingsValues,
} from 'Settings/UI/useUiSettings';
import { setCalendarOption } from 'Store/Actions/calendarActions';
import CalendarOptionsModalContent from './CalendarOptionsModalContent';

interface CalendarOptionsModalContentConnectorProps {
  onModalClose: () => void;
}

// The calendar is still redux (Stage 3); only its UI settings (first day of week,
// week header, time format, colour-impaired mode) are saved through react-query,
// which also copies them into the state.settings.ui feed the calendar reads.
function CalendarOptionsModalContentConnector(
  props: CalendarOptionsModalContentConnectorProps
) {
  const dispatch = useDispatch();
  const options = useSelector(
    (state: AppState & { calendar: { options: object } }) =>
      state.calendar.options
  );
  const uiSettings = useUiSettingsValues();
  const saveUiSettings = useSaveUiSettings();

  const handleSetCalendarOption = useCallback(
    (option: object) => {
      dispatch(setCalendarOption(option));
    },
    [dispatch]
  );

  const handleSaveUiSettings = useCallback(
    (changes: Partial<UiSettingsModel>) => {
      saveUiSettings(changes);
    },
    [saveUiSettings]
  );

  return (
    <CalendarOptionsModalContent
      {...options}
      {...uiSettings}
      {...props}
      dispatchSetCalendarOption={handleSetCalendarOption}
      dispatchSaveUISettings={handleSaveUiSettings}
    />
  );
}

export default CalendarOptionsModalContentConnector;
