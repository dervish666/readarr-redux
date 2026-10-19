import { isEmpty } from 'lodash';
import { getValidationFailures } from 'Helpers/Hooks/useApiMutation';
import Field from 'typings/Field';
import {
  Failure,
  Pending,
  PendingField,
  PendingSection,
  ValidationFailure,
} from 'typings/pending';
import { ApiError } from 'Utilities/Fetch/fetchJson';

function mapFailure(failure: ValidationFailure): Failure {
  return {
    errorMessage: failure.errorMessage,
    infoLink: failure.infoLink,
    detailedDescription: failure.detailedDescription,
    message: failure.errorMessage,
    link: failure.infoLink,
    detailedMessage: failure.detailedDescription,
  };
}

// Takes the failures for one property out of the list, so whatever is left over
// belongs to no field and can be shown on its own.
function takeFailures(failures: ValidationFailure[], key: string) {
  const result: Failure[] = [];

  for (let i = failures.length - 1; i >= 0; i--) {
    if (failures[i].propertyName.toLowerCase() === key.toLowerCase()) {
      result.unshift(mapFailure(failures[i]));
      failures.splice(i, 1);
    }
  }

  return result;
}

// Provider fields come back as a list of PendingFields. Their pending changes
// arrive as one { [fieldName]: value } object under `fields`.
function selectFields(
  fields: Field[],
  pendingFields: Record<string, unknown> | undefined,
  errors: ValidationFailure[],
  warnings: ValidationFailure[]
) {
  return fields.map((f) => {
    const field: PendingField = {
      ...f,
      pending: false,
      errors: [],
      warnings: [],
    };

    if (
      pendingFields &&
      Object.prototype.hasOwnProperty.call(pendingFields, field.name)
    ) {
      field.previousValue = field.value;
      field.value = pendingFields[field.name] as Field['value'];
      field.pending = true;
    }

    field.errors = takeFailures(errors, field.name);
    field.warnings = takeFailures(warnings, field.name);

    return field;
  });
}

// The react-query version of Store/Selectors/selectSettings: one
// { value, errors, warnings, pending } entry per property, the shape
// FormInputGroup takes, with pending changes laid over the saved item.
// Providers get implementationName as a plain string and fields as PendingFields.
function selectSettings<T extends object>(
  item: T,
  pendingChanges: Partial<T>,
  saveError?: ApiError | null
) {
  const { errors, warnings } = getValidationFailures(saveError);
  const allSettings = { ...item, ...pendingChanges };
  const itemFields = (item as { fields?: unknown }).fields;
  const hasFields = Array.isArray(itemFields);

  const settings = (Object.keys(allSettings) as (keyof T & string)[]).reduce(
    (acc, key) => {
      if (key === 'fields' && hasFields) {
        return acc;
      }

      if (key === 'implementationName') {
        // Providers read implementationName unwrapped.
        (acc as Record<string, unknown>)[key] = item[key];

        return acc;
      }

      const setting: Pending<T[typeof key]> = {
        value: item[key],
        pending: false,
        errors: takeFailures(errors, key),
        warnings: takeFailures(warnings, key),
      };

      if (Object.prototype.hasOwnProperty.call(pendingChanges, key)) {
        setting.previousValue = setting.value;
        setting.value = pendingChanges[key] as T[typeof key];
        setting.pending = true;
      }

      acc[key] = setting;

      return acc;
    },
    {} as PendingSection<T>
  );

  if (hasFields) {
    (settings as Record<string, unknown>).fields = selectFields(
      itemFields as Field[],
      (pendingChanges as { fields?: Record<string, unknown> }).fields,
      errors,
      warnings
    );
  }

  return {
    settings,
    validationErrors: errors,
    validationWarnings: warnings,
    hasPendingChanges: !isEmpty(pendingChanges),
    hasSettings: !isEmpty(settings),
  };
}

export default selectSettings;
