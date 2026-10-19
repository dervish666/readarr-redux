import { useCallback } from 'react';
import {
  useManageSettings,
  useSaveSettings,
  useSettings,
} from 'Settings/useSettings';

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

export const useUiSettings = () => {
  return useSettings<UiSettingsModel>(PATH, QUERY_OPTIONS);
};

export const useUiSettingsValues = () => {
  const { data } = useUiSettings();

  return data;
};

export const useManageUiSettings = () => {
  return useManageSettings<UiSettingsModel>(PATH);
};

export const useSaveUiSettings = () => {
  const data = useUiSettingsValues();
  const { save } = useSaveSettings<UiSettingsModel>(PATH);

  return useCallback(
    (changes: Partial<UiSettingsModel>) => {
      save({ ...data, ...changes });
    },
    [data, save]
  );
};
