import React from 'react';
import * as commandNames from 'Commands/commandNames';
import translate from 'Utilities/String/translate';
import Wanted from 'Wanted/Wanted';
import {
  setMissingOption,
  setMissingOptions,
  setMissingSort,
  useMissingOptions,
} from './missingOptionsStore';
import useMissing from './useMissing';

function Missing() {
  const data = useMissing();
  const options = useMissingOptions();

  return (
    <Wanted
      title={translate('Missing')}
      searchAllCommand={commandNames.MISSING_BOOK_SEARCH}
      searchAllTitle={translate('SearchForAllMissingBooks')}
      searchAllMessage={(totalRecords) =>
        translate('SearchForAllMissingBooksConfirmationCount', { totalRecords })
      }
      loadError={translate('MissingLoadError')}
      emptyMessage={translate('NoMissingItems')}
      showManualImport={true}
      data={data}
      options={options}
      setOption={setMissingOption}
      setOptions={setMissingOptions}
      setSort={setMissingSort}
    />
  );
}

export default Missing;
