import React from 'react';
import * as commandNames from 'Commands/commandNames';
import translate from 'Utilities/String/translate';
import Wanted from 'Wanted/Wanted';
import {
  setCutoffUnmetOption,
  setCutoffUnmetOptions,
  setCutoffUnmetSort,
  useCutoffUnmetOptions,
} from './cutoffUnmetOptionsStore';
import useCutoffUnmet from './useCutoffUnmet';

function CutoffUnmet() {
  const data = useCutoffUnmet();
  const options = useCutoffUnmetOptions();

  return (
    <Wanted
      title={translate('CutoffUnmet')}
      searchAllCommand={commandNames.CUTOFF_UNMET_BOOK_SEARCH}
      searchAllTitle={translate('SearchForAllCutoffUnmetBooks')}
      searchAllMessage={(totalRecords) =>
        translate('SearchForAllCutoffUnmetBooksConfirmationCount', {
          totalRecords,
        })
      }
      loadError={translate('CutoffUnmetLoadError')}
      emptyMessage={translate('NoCutoffUnmetItems')}
      showManualImport={false}
      data={data}
      options={options}
      setOption={setCutoffUnmetOption}
      setOptions={setCutoffUnmetOptions}
      setSort={setCutoffUnmetSort}
    />
  );
}

export default CutoffUnmet;
