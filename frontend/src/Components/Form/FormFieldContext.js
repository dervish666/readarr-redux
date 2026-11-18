import { createContext } from 'react';

const FormFieldContext = createContext(null);

export function getFormInputId(field, name) {
  return field ? `${field.id}-${name ?? 'input'}` : undefined;
}

export default FormFieldContext;
