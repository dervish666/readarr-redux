import { keepPreviousData } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import { useManageSettings } from 'Settings/useSettings';
import { update } from 'Store/Actions/baseActions';
import { PendingSection } from 'typings/pending';
import { QueryParams } from 'Utilities/Fetch/getQueryString';

const PATH = '/config/naming';
const EXAMPLES_PATH = '/config/naming/examples';

// Readarr.Api.V1/Config/NamingConfigResource. The include*/separator/numberStyle
// fields are the basic naming options the UI never shows; they ride along unchanged.
export interface NamingSettingsModel {
  id: number;
  renameBooks: boolean;
  replaceIllegalCharacters: boolean;
  colonReplacementFormat: number;
  standardBookFormat: string;
  authorFolderFormat: string;
  includeAuthorName: boolean;
  includeBookTitle: boolean;
  includeQuality: boolean;
  replaceSpaces: boolean;
  separator: string;
  numberStyle: string;
}

// Readarr.Api.V1/Config/NamingExampleResource.
export interface NamingExamples {
  singleBookExample: string | null;
  multiPartBookExample: string | null;
  authorFolderExample: string | null;
}

// Organize (rename preview) still reads state.settings.naming, a read-only feed
// until Stage 3; every save copies the saved settings there.
export const useManageNamingSettings = () => {
  const dispatch = useDispatch();

  const handleSaved = useCallback(
    (data: NamingSettingsModel) => {
      dispatch(update({ section: 'settings.naming', data }));
    },
    [dispatch]
  );

  return useManageSettings<NamingSettingsModel>(PATH, handleSaved);
};

// The examples for the settings as edited, pending changes included.
export const useNamingExamples = (
  settings: PendingSection<NamingSettingsModel>
) => {
  const queryParams = useMemo<QueryParams>(() => {
    return Object.entries(settings).reduce<QueryParams>(
      (acc, [key, setting]) => {
        acc[key] = (setting as { value: QueryParams[string] }).value;

        return acc;
      },
      {}
    );
  }, [settings]);

  const { data, error, isFetching } = useApiQuery<NamingExamples>({
    path: EXAMPLES_PATH,
    queryParams,
    queryOptions: {
      enabled: Object.keys(queryParams).length > 0,
      placeholderData: keepPreviousData,
    },
  });

  return {
    examples: data,
    isExamplesFetching: isFetching,
    examplesError: error,
  };
};
