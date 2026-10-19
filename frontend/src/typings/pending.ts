import Field from './Field';
import Provider from './Provider';

export interface ValidationFailure {
  isWarning: boolean;
  propertyName: string;
  errorMessage: string;
  infoLink?: string;
  detailedDescription?: string;
  severity: 'error' | 'warning';
}

export interface ValidationError extends ValidationFailure {
  isWarning: false;
}

export interface ValidationWarning extends ValidationFailure {
  isWarning: true;
}

export interface Failure {
  errorMessage: ValidationFailure['errorMessage'];
  infoLink: ValidationFailure['infoLink'];
  detailedDescription: ValidationFailure['detailedDescription'];

  // The redux-era names FormInputGroup still reads.
  message: ValidationFailure['errorMessage'];
  link: ValidationFailure['infoLink'];
  detailedMessage: ValidationFailure['detailedDescription'];
}

export interface Pending<T> {
  value: T;
  errors: Failure[];
  warnings: Failure[];
  pending?: boolean;
  previousValue?: T;
}

export type PendingSection<T> = {
  [Prop in keyof T]: Pending<T[Prop]>;
};

// A provider field with its own pending state, as ProviderFieldFormGroup takes it.
export interface PendingField
  extends Field,
    Omit<Pending<Field['value']>, 'value' | 'previousValue'> {
  pending: boolean;
  previousValue?: Field['value'];
}

// selectSettings flattens implementationName and turns fields into PendingFields.
export type PendingProviderSection<T extends Provider> = Omit<
  PendingSection<T>,
  'fields' | 'implementationName'
> & {
  implementationName: string;
  fields: PendingField[];
};
