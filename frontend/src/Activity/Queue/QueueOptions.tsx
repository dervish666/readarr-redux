import React, { useCallback } from 'react';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import { inputTypes } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import { setQueueOption, useQueueOption } from './queueOptionsStore';

function QueueOptions() {
  const includeUnknownAuthorItems = useQueueOption('includeUnknownAuthorItems');

  const handleOptionChange = useCallback(
    ({ value }: { name: string; value: boolean }) => {
      setQueueOption('includeUnknownAuthorItems', value);
    },
    []
  );

  return (
    <FormGroup>
      <FormLabel>{translate('ShowUnknownAuthorItems')}</FormLabel>

      <FormInputGroup
        type={inputTypes.CHECK}
        name="includeUnknownAuthorItems"
        value={includeUnknownAuthorItems}
        helpText={translate('IncludeUnknownAuthorItemsHelpText')}
        onChange={handleOptionChange}
      />
    </FormGroup>
  );
}

export default QueueOptions;
