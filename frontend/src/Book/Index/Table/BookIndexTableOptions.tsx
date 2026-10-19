import React, { useCallback } from 'react';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import { inputTypes } from 'Helpers/Props';
import { InputChanged } from 'typings/inputs';
import translate from 'Utilities/String/translate';
import {
  BookIndexTableOptions as TableOptions,
  setBookIndexTableOptions,
  useBookIndexTableOptions,
} from '../bookIndexOptionsStore';

// The extra options in the table options modal; changes apply at once.
function BookIndexTableOptions() {
  const { showSearchAction } = useBookIndexTableOptions();

  const handleChange = useCallback(({ name, value }: InputChanged) => {
    setBookIndexTableOptions({ [name]: value } as Partial<TableOptions>);
  }, []);

  return (
    <FormGroup>
      <FormLabel>{translate('ShowSearch')}</FormLabel>

      <FormInputGroup
        type={inputTypes.CHECK}
        name="showSearchAction"
        value={showSearchAction}
        helpText={translate('ShowSearchActionHelpText')}
        onChange={handleChange}
      />
    </FormGroup>
  );
}

export default BookIndexTableOptions;
