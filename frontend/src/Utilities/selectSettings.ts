import { isEmpty } from 'lodash';
import { getValidationFailures } from 'Helpers/Hooks/useApiMutation';
import {
  Failure,
  Pending,
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

// The react-query version of Store/Selectors/selectSettings: one
// { value, errors, warnings, pending } entry per property, the shape
// FormInputGroup takes, with pending changes laid over the saved item.
function selectSettings<T extends object>(
  item: T,
  pendingChanges: Partial<T>,
  saveError?: ApiError | null
) {
  const { errors, warnings } = getValidationFailures(saveError);
  const allSettings = { ...item, ...pendingChanges };

  const settings = (Object.keys(allSettings) as (keyof T & string)[]).reduce(
    (acc, key) => {
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

  return {
    settings,
    validationErrors: errors,
    validationWarnings: warnings,
    hasPendingChanges: !isEmpty(pendingChanges),
    hasSettings: !isEmpty(settings),
  };
}

export default selectSettings;
