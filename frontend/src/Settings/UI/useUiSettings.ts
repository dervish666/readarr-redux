import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  useManageSettings,
  useSaveSettings,
  useSettings,
} from 'Settings/useSettings';
import { update } from 'Store/Actions/baseActions';

// Readarr.Api.V1/Config/UiConfigResource.
export interface UiSettingsModel {
  id: number;
  theme: 'auto' | 'dark' | 'light';
  showRelativeDates: boolean;
  shortDateFormat: string;
  longDateFormat: string;
  timeFormat: string;
  firstDayOfWeek: number;
  enableColorImpairedMode: boolean;
  headerColor: 'fullColor' | 'gradient';
  calendarWeekColumnHeader: string;
  uiLanguage: number;
}

const PATH = '/config/ui';
const QUERY_OPTIONS = { staleTime: 60 * 60 * 1000 };

// The author, book, calendar and other redux pages read state.settings.ui (a
// read-only feed until Stage 3), so every save copies the saved settings there too.
const useCopyToFeed = () => {
  const dispatch = useDispatch();

  return useCallback(
    (data: UiSettingsModel) => {
      dispatch(update({ section: 'settings.ui', data }));
    },
    [dispatch]
  );
};

export const useUiSettings = () => {
  return useSettings<UiSettingsModel>(PATH, QUERY_OPTIONS);
};

export const useUiSettingsValues = () => {
  const { data } = useUiSettings();

  return data;
};

export const useManageUiSettings = () => {
  return useManageSettings<UiSettingsModel>(PATH, useCopyToFeed());
};

export const useSaveUiSettings = () => {
  const data = useUiSettingsValues();
  const { save } = useSaveSettings<UiSettingsModel>(PATH, useCopyToFeed());

  return useCallback(
    (changes: Partial<UiSettingsModel>) => {
      save({ ...data, ...changes });
    },
    [data, save]
  );
};
