import { createPersist } from 'Helpers/createPersist';

// "Show advanced" for every settings page and provider modal (Sonarr 7e7023800).
// Persisted per instance; the old redux `settings.advancedSettings` value is dropped.
interface AdvancedSettingsState {
  showAdvancedSettings: boolean;
}

const advancedSettingsStore = createPersist<AdvancedSettingsState>(
  'advanced_settings',
  () => ({ showAdvancedSettings: false })
);

export const useShowAdvancedSettings = () => {
  return advancedSettingsStore((state) => state.showAdvancedSettings);
};

export const toggleShowAdvancedSettings = () => {
  advancedSettingsStore.setState((state) => ({
    showAdvancedSettings: !state.showAdvancedSettings,
  }));
};
