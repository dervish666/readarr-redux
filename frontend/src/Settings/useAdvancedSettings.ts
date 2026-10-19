import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AppState from 'App/State/AppState';
import { toggleAdvancedSettings } from 'Store/Actions/settingsActions';

// "Show advanced" stays in redux (persisted, shared with the settings pages that
// are not on react-query yet).
function useAdvancedSettings() {
  const dispatch = useDispatch();
  const advancedSettings = useSelector(
    (state: AppState) => state.settings.advancedSettings
  );

  const toggle = useCallback(() => {
    dispatch(toggleAdvancedSettings());
  }, [dispatch]);

  return [advancedSettings, toggle] as const;
}

export default useAdvancedSettings;
