import React, { useCallback } from 'react';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import { inputTypes } from 'Helpers/Props';
import { InputChanged } from 'typings/inputs';
import translate from 'Utilities/String/translate';
import {
  AuthorIndexTableOptions as TableOptions,
  setAuthorIndexTableOptions,
  useAuthorIndexTableOptions,
} from '../authorIndexOptionsStore';

const nameOptions = [
  {
    key: 'firstLast',
    get value() {
      return translate('NameFirstLast');
    },
  },
  {
    key: 'lastFirst',
    get value() {
      return translate('NameLastFirst');
    },
  },
];

// The extra options in the table options modal; changes apply at once.
function AuthorIndexTableOptions() {
  const { showTitle, showBanners, showSearchAction } =
    useAuthorIndexTableOptions();

  const handleChange = useCallback(({ name, value }: InputChanged) => {
    setAuthorIndexTableOptions({ [name]: value } as Partial<TableOptions>);
  }, []);

  return (
    <>
      <FormGroup>
        <FormLabel>{translate('NameStyle')}</FormLabel>

        <FormInputGroup
          type={inputTypes.SELECT}
          name="showTitle"
          value={showTitle}
          values={nameOptions}
          onChange={handleChange}
        />
      </FormGroup>

      <FormGroup>
        <FormLabel>{translate('ShowBanners')}</FormLabel>

        <FormInputGroup
          type={inputTypes.CHECK}
          name="showBanners"
          value={showBanners}
          helpText={translate('ShowBannersHelpText')}
          onChange={handleChange}
        />
      </FormGroup>

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
    </>
  );
}

export default AuthorIndexTableOptions;
