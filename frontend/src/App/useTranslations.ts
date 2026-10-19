import { useMemo } from 'react';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import { setTranslations } from 'Utilities/String/translate';

interface TranslationsResponse {
  Strings: Record<string, string>;
}

// v1's LocalizationController returns the dictionary pre-serialized as a string, so a
// JSON request gets it JSON-encoded a second time. Accept either form.
function parseTranslations(data: TranslationsResponse | string) {
  const response: TranslationsResponse =
    typeof data === 'string' ? JSON.parse(data) : data;

  return response.Strings;
}

// Fetched once per page load. translate() stays synchronous for its 900-odd callers,
// so the strings are copied into translate's module store as soon as they arrive,
// during the same render that lets PageConnector show the app.
export function useTranslations() {
  const { data, ...result } = useApiQuery<TranslationsResponse | string>({
    path: '/localization',
    queryOptions: {
      staleTime: Infinity,
      gcTime: Infinity,
    },
  });

  const strings = useMemo(
    () => (data ? parseTranslations(data) : undefined),
    [data]
  );

  if (strings) {
    setTranslations(strings);
  }

  return {
    ...result,
    data: strings,
  };
}

export default useTranslations;
