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
