// Readarr.Http/ClientSchema/Field and SelectOption.
export interface FieldSelectOption<T> {
  value: T;
  name: string;
  order: number;
  hint?: string;
  parentValue?: T;
  isDisabled?: boolean;
  additionalProperties?: Record<string, unknown>;
}

interface Field {
  order: number;
  name: string;
  label: string;
  unit?: string;
  helpText?: string;
  helpTextWarning?: string;
  helpLink?: string;
  value: boolean | number | string | number[] | string[];
  type: string;
  advanced: boolean;
  selectOptions?: FieldSelectOption<number>[];
  selectOptionsProviderAction?: string;
  section?: string;
  hidden?: 'hidden' | 'hiddenIfNotSet' | 'visible';
  placeholder?: string;
  isFloat?: boolean;
  // Not sent by v1; kept so a clone can blank secrets if the backend adds it.
  privacy?: string;
}

export default Field;
