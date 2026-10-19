import { createPersist } from 'Helpers/createPersist';

// "Show advanced" for every settings page and provider modal (Sonarr 7e7023800).
// Persisted per instance under its own key.
interface AdvancedSettingsState {
  showAdvancedSettings: boolean;
}

const advancedSettingsStore = createPersist<AdvancedSettingsState>(
  'advanced_settings',
  () => ({ showAdvancedSettings: false })
);

// Before this store the flag lived in the redux-localstorage blob (key `readarr`, see
// Store/Middleware/createPersistState) at settings.advancedSettings. Seed from it once,
// while the new key is still absent. This runs at module load, before the redux store
// exists, because redux-localstorage rewrites the blob without that path on its first
// write. Hydration does not write an absent key, so the check below sees a first load.
function seedFromLegacySetting() {
  try {
    const name = advancedSettingsStore.persist.getOptions().name;

    if (!name || localStorage.getItem(name) !== null) {
      return;
    }

    const legacy = JSON.parse(localStorage.getItem('readarr') ?? 'null');
    const value = legacy?.settings?.advancedSettings;

    if (typeof value === 'boolean') {
      advancedSettingsStore.setState({ showAdvancedSettings: value });
    }
  } catch (error) {
    console.warn('Could not carry over the old Show Advanced setting', error);
  }
}

seedFromLegacySetting();

export const useShowAdvancedSettings = () => {
  return advancedSettingsStore((state) => state.showAdvancedSettings);
};

export const toggleShowAdvancedSettings = () => {
  advancedSettingsStore.setState((state) => ({
    showAdvancedSettings: !state.showAdvancedSettings,
  }));
};
