import { InputOnChange } from 'typings/inputs';
import { PendingSection } from 'typings/pending';
import { GeneralSettingsModel } from './useGeneralSettings';

// What every section of Settings > General takes.
export interface GeneralSettingsSectionProps {
  settings: PendingSection<GeneralSettingsModel>;
  onInputChange: InputOnChange<unknown>;
}
